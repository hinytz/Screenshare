using System.Runtime.InteropServices;
using NAudio.CoreAudioApi;
using NAudio.Wave;

internal static class Program
{
    public static readonly WaveFormat OutputFormat = WaveFormat.CreateIeeeFloatWaveFormat(48000, 2);

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            var options = Options.Parse(args);
            using IPcmSource capture = options.System
                ? new SystemLoopbackSource()
                : new ProcessLoopbackSource(options.Pid);
            using var stdout = Console.OpenStandardOutput();
            capture.Run(stdout);
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private sealed class Options
    {
        public bool System { get; private set; }
        public uint Pid { get; private set; }
        public string Source { get; private set; } = "pid";

        public static Options Parse(string[] args)
        {
            var options = new Options();
            for (var i = 0; i < args.Length; i++)
            {
                switch (args[i])
                {
                    case "--system":
                        options.System = true;
                        break;
                    case "--pid" when i + 1 < args.Length:
                        options.Pid = uint.Parse(args[++i]);
                        options.Source = "pid";
                        break;
                    case "--hwnd" when i + 1 < args.Length:
                        var hwnd = nint.Parse(args[++i]);
                        Native.GetWindowThreadProcessId(hwnd, out var pid);
                        if (pid == 0) throw new InvalidOperationException("Could not resolve HWND to PID.");
                        options.Pid = pid;
                        options.Source = "hwnd";
                        break;
                }
            }

            if (!options.System && options.Pid == 0)
            {
                throw new InvalidOperationException("Pass --pid, --hwnd, or --system.");
            }

            if (!options.System)
            {
                var sourcePid = options.Pid;
                options.Pid = ProcessTree.ResolveSameImageRoot(sourcePid, out var image);
                Console.Error.WriteLine($"{options.Source} pid {sourcePid} -> root {options.Pid} {image}");
            }

            return options;
        }
    }
}

internal static class ProcessTree
{
    public static uint ResolveSameImageRoot(uint pid, out string image)
    {
        var processes = Snapshot();
        if (!processes.TryGetValue(pid, out var start))
        {
            image = "?";
            return pid;
        }

        image = FileName(start.Exe);
        var current = pid;
        var seen = new HashSet<uint> { current };
        while (processes.TryGetValue(current, out var entry))
        {
            var parent = entry.Parent;
            if (parent == 0 || !seen.Add(parent)) break;
            if (!processes.TryGetValue(parent, out var parentEntry)) break;
            var parentImage = FileName(parentEntry.Exe);
            if (!string.Equals(image, parentImage, StringComparison.OrdinalIgnoreCase)) break;
            current = parent;
            image = parentImage;
        }

        return current;
    }

    private static string FileName(string path) =>
        string.IsNullOrWhiteSpace(path) ? "?" : Path.GetFileName(path);

    private static Dictionary<uint, ProcessInfo> Snapshot()
    {
        var map = new Dictionary<uint, ProcessInfo>();
        var snap = Native.CreateToolhelp32Snapshot(Native.Th32csSnapProcess, 0);
        if (snap == nint.Zero || snap == Native.InvalidHandleValue) return map;

        try
        {
            var entry = new ProcessEntry32 { dwSize = (uint)Marshal.SizeOf<ProcessEntry32>() };
            if (!Native.Process32First(snap, ref entry)) return map;
            do
            {
                map[entry.th32ProcessID] = new ProcessInfo(entry.th32ParentProcessID, entry.szExeFile ?? "");
            }
            while (Native.Process32Next(snap, ref entry));
        }
        finally
        {
            Native.CloseHandle(snap);
        }

        return map;
    }

    private readonly record struct ProcessInfo(uint Parent, string Exe);
}

internal interface IPcmSource : IDisposable
{
    void Run(Stream output);
}

internal sealed class SystemLoopbackSource : IPcmSource
{
    private WasapiLoopbackCapture? _capture;
    private readonly ManualResetEventSlim _stop = new(false);

    public void Run(Stream output)
    {
        _capture = new WasapiLoopbackCapture();
        var converter = new PcmConverter(_capture.WaveFormat);
        _capture.DataAvailable += (_, e) =>
        {
            if (e.BytesRecorded <= 0) return;
            converter.Write(e.Buffer.AsSpan(0, e.BytesRecorded), output);
        };
        _capture.RecordingStopped += (_, _) => _stop.Set();
        _capture.StartRecording();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            _stop.Set();
        };
        _stop.Wait();
        _capture.StopRecording();
    }

    public void Dispose()
    {
        _capture?.Dispose();
        _stop.Dispose();
    }
}

internal sealed class ProcessLoopbackSource : IPcmSource
{
    private readonly uint _pid;
    private readonly ManualResetEventSlim _activated = new(false);
    private readonly ManualResetEventSlim _stop = new(false);
    private IAudioClient? _client;
    private Exception? _activateError;

    public ProcessLoopbackSource(uint pid) => _pid = pid;

    public void Run(Stream output)
    {
        if (!Activate(out var client, out var error) || client is null)
        {
            Console.Error.WriteLine(error ?? "Process loopback failed; falling back to system audio.");
            using var fallback = new SystemLoopbackSource();
            fallback.Run(output);
            return;
        }

        _client = client;
        var hr = client.GetMixFormat(out var mixPtr);
        Marshal.ThrowExceptionForHR(hr);
        var mix = Marshal.PtrToStructure<WaveFormatEx>(mixPtr);
        var converter = new PcmConverter(ToNAudio(mix));

        hr = client.Initialize(0, 0, 10_000_000, 0, mixPtr, IntPtr.Zero);
        Marshal.ThrowExceptionForHR(hr);
        hr = client.GetService(typeof(IAudioCaptureClient).GUID, out var captureObj);
        Marshal.ThrowExceptionForHR(hr);
        var capture = (IAudioCaptureClient)captureObj;

        hr = client.Start();
        Marshal.ThrowExceptionForHR(hr);

        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            _stop.Set();
        };

        var frameBytes = mix.nBlockAlign;
        while (!_stop.IsSet)
        {
            Thread.Sleep(10);
            hr = capture.GetNextPacketSize(out var frames);
            if (hr != 0) break;
            while (frames > 0)
            {
                hr = capture.GetBuffer(out var data, out var got, out var flags, out _, out _);
                if (hr != 0) break;
                var bytes = (int)(got * frameBytes);
                if (bytes > 0 && (flags & 0x2) == 0)
                {
                    var buffer = new byte[bytes];
                    Marshal.Copy(data, buffer, 0, bytes);
                    converter.Write(buffer, output);
                }
                capture.ReleaseBuffer(got);
                capture.GetNextPacketSize(out frames);
            }
        }

        client.Stop();
        Marshal.FreeCoTaskMem(mixPtr);
    }

    private bool Activate(out IAudioClient? client, out string? error)
    {
        client = null;
        error = null;
        var handler = new ActivationHandler(_activated, result =>
        {
            _client = result.Client;
            _activateError = result.Error;
        });

        var activation = new AudioClientActivationParams
        {
            ActivationType = 1,
            TargetProcessId = _pid,
            ProcessLoopbackMode = 0,
        };
        var size = Marshal.SizeOf<AudioClientActivationParams>();
        var blob = Marshal.AllocHGlobal(size);
        try
        {
            Marshal.StructureToPtr(activation, blob, false);
            var prop = new PropVariant
            {
                vt = 65,
                blobSize = (uint)size,
                blobData = blob,
            };
            var hr = Native.ActivateAudioInterfaceAsync(
                Native.ProcessLoopbackDevice,
                typeof(IAudioClient).GUID,
                ref prop,
                handler,
                out _);
            if (hr != 0)
            {
                error = $"ActivateAudioInterfaceAsync failed (0x{hr:X8}).";
                return false;
            }

            if (!_activated.Wait(4000))
            {
                error = "Timed out activating process loopback.";
                return false;
            }
            GC.KeepAlive(handler);

            if (_activateError is not null)
            {
                error = _activateError.Message;
                return false;
            }

            client = _client;
            return client is not null;
        }
        finally
        {
            Marshal.FreeHGlobal(blob);
        }
    }

    private static WaveFormat ToNAudio(WaveFormatEx mix)
    {
        return mix.wFormatTag == 3
            ? WaveFormat.CreateIeeeFloatWaveFormat(mix.nSamplesPerSec, mix.nChannels)
            : new WaveFormat(mix.nSamplesPerSec, mix.wBitsPerSample, mix.nChannels);
    }

    public void Dispose()
    {
        _activated.Dispose();
        _stop.Dispose();
        if (_client is not null) Marshal.ReleaseComObject(_client);
    }
}

internal sealed class PcmConverter
{
    private readonly int _inRate;
    private readonly int _inCh;
    private readonly int _inBits;
    private readonly bool _ieee;
    private double _phase;

    public PcmConverter(WaveFormat source)
    {
        _inRate = source.SampleRate;
        _inCh = source.Channels;
        _inBits = source.BitsPerSample;
        _ieee = source.Encoding == WaveFormatEncoding.IeeeFloat;
    }

    public void Write(ReadOnlySpan<byte> input, Stream output)
    {
        var samples = ToStereoFloat(input);
        var resampled = Resample(samples);
        var bytes = MemoryMarshal.AsBytes(resampled.AsSpan());
        output.Write(bytes);
        output.Flush();
    }

    private float[] ToStereoFloat(ReadOnlySpan<byte> input)
    {
        if (_ieee && _inBits == 32)
        {
            var floats = MemoryMarshal.Cast<byte, float>(input);
            if (_inCh == 2) return floats.ToArray();
            var mono = new float[floats.Length * 2];
            for (var i = 0; i < floats.Length; i++)
            {
                mono[i * 2] = floats[i];
                mono[i * 2 + 1] = floats[i];
            }
            return mono;
        }

        if (_inBits == 16)
        {
            var shorts = MemoryMarshal.Cast<byte, short>(input);
            var frames = shorts.Length / Math.Max(_inCh, 1);
            var stereo = new float[frames * 2];
            for (var i = 0; i < frames; i++)
            {
                var left = shorts[i * _inCh] / 32768f;
                var right = _inCh > 1 ? shorts[i * _inCh + 1] / 32768f : left;
                stereo[i * 2] = left;
                stereo[i * 2 + 1] = right;
            }
            return stereo;
        }

        return [];
    }

    private float[] Resample(float[] stereo)
    {
        if (_inRate == 48000) return stereo;
        var inFrames = stereo.Length / 2;
        var outFrames = (int)(inFrames * (48000.0 / _inRate));
        var dest = new float[outFrames * 2];
        var step = (double)_inRate / 48000.0;
        for (var i = 0; i < outFrames; i++)
        {
            var src = _phase + i * step;
            var i0 = Math.Min((int)src, inFrames - 1);
            dest[i * 2] = stereo[i0 * 2];
            dest[i * 2 + 1] = stereo[i0 * 2 + 1];
        }
        _phase = (_phase + outFrames * step) % Math.Max(inFrames, 1);
        return dest;
    }
}

[ComImport]
[Guid("94ea2b94-e9cc-49e0-c0ff-ee64ca8f5b90")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAgileObject;

[ComVisible(true)]
[ClassInterface(ClassInterfaceType.None)]
internal sealed class ActivationHandler : IActivateAudioInterfaceCompletionHandler, IAgileObject
{
    private readonly ManualResetEventSlim _done;
    private readonly Action<ActivationResult> _onDone;

    public ActivationHandler(ManualResetEventSlim done, Action<ActivationResult> onDone)
    {
        _done = done;
        _onDone = onDone;
    }

    public void ActivateCompleted(IActivateAudioInterfaceAsyncOperation operation)
    {
        try
        {
            operation.GetActivateResult(out var hr, out var activated);
            if (hr != 0)
            {
                _onDone(new ActivationResult(null, Marshal.GetExceptionForHR(hr)));
                return;
            }

            _onDone(new ActivationResult((IAudioClient)activated, null));
        }
        catch (Exception ex)
        {
            _onDone(new ActivationResult(null, ex));
        }
        finally
        {
            _done.Set();
        }
    }
}

internal readonly record struct ActivationResult(IAudioClient? Client, Exception? Error);

internal static class Native
{
    public const string ProcessLoopbackDevice = @"VAD\Process_Loopback";

    public const uint Th32csSnapProcess = 2;
    public static readonly nint InvalidHandleValue = new(-1);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(nint hWnd, out uint processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern nint CreateToolhelp32Snapshot(uint flags, uint processId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode, EntryPoint = "Process32FirstW")]
    public static extern bool Process32First(nint snapshot, ref ProcessEntry32 entry);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode, EntryPoint = "Process32NextW")]
    public static extern bool Process32Next(nint snapshot, ref ProcessEntry32 entry);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(nint handle);

    [DllImport("Mmdevapi.dll", CharSet = CharSet.Unicode)]
    public static extern int ActivateAudioInterfaceAsync(
        string deviceInterfacePath,
        [MarshalAs(UnmanagedType.LPStruct)] Guid riid,
        ref PropVariant activationParams,
        IActivateAudioInterfaceCompletionHandler completionHandler,
        out IActivateAudioInterfaceAsyncOperation activationOperation);
}

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
internal struct ProcessEntry32
{
    public uint dwSize;
    public uint cntUsage;
    public uint th32ProcessID;
    public nint th32DefaultHeapID;
    public uint th32ModuleID;
    public uint cntThreads;
    public uint th32ParentProcessID;
    public int pcPriClassBase;
    public uint dwFlags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
    public string szExeFile;
}

[StructLayout(LayoutKind.Sequential)]
internal struct AudioClientActivationParams
{
    public int ActivationType;
    public uint TargetProcessId;
    public int ProcessLoopbackMode;
}

[StructLayout(LayoutKind.Explicit)]
internal struct PropVariant
{
    [FieldOffset(0)] public ushort vt;
    [FieldOffset(8)] public uint blobSize;
    [FieldOffset(16)] public IntPtr blobData;
}

[StructLayout(LayoutKind.Sequential)]
internal struct WaveFormatEx
{
    public ushort wFormatTag;
    public ushort nChannels;
    public int nSamplesPerSec;
    public int nAvgBytesPerSec;
    public ushort nBlockAlign;
    public ushort wBitsPerSample;
    public ushort cbSize;
}

[ComImport]
[Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioClient
{
    [PreserveSig] int Initialize(uint shareMode, uint streamFlags, long bufferDuration, long periodicity, IntPtr format, IntPtr sessionId);
    [PreserveSig] int GetBufferSize(out uint bufferSize);
    [PreserveSig] int GetStreamLatency(out long latency);
    [PreserveSig] int GetCurrentPadding(out uint padding);
    [PreserveSig] int IsFormatSupported(uint shareMode, IntPtr format, out IntPtr closest);
    [PreserveSig] int GetMixFormat(out IntPtr deviceFormat);
    [PreserveSig] int GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
    [PreserveSig] int Start();
    [PreserveSig] int Stop();
    [PreserveSig] int Reset();
    [PreserveSig] int SetEventHandle(IntPtr eventHandle);
    [PreserveSig] int GetService(Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
}

[ComImport]
[Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioCaptureClient
{
    [PreserveSig] int GetBuffer(out IntPtr data, out uint numFramesAvailable, out uint flags, out ulong devicePosition, out ulong qpcPosition);
    [PreserveSig] int ReleaseBuffer(uint numFramesRead);
    [PreserveSig] int GetNextPacketSize(out uint numFramesInNextPacket);
}

[ComImport]
[Guid("41D949AB-9863-4B1A-8213-0E89587C8C87")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IActivateAudioInterfaceCompletionHandler
{
    void ActivateCompleted(IActivateAudioInterfaceAsyncOperation activateOperation);
}

[ComImport]
[Guid("72A22D78-CDE4-431D-B8CC-843A71199B6D")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IActivateAudioInterfaceAsyncOperation
{
    void GetActivateResult(out int activateResult, [MarshalAs(UnmanagedType.IUnknown)] out object activatedInterface);
}
