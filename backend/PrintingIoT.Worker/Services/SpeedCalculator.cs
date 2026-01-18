using System.Collections.Concurrent;

namespace PrintingIoT.Worker.Services;

public class SpeedCalculator
{
    private readonly int _windowSize;
    private readonly ConcurrentQueue<decimal> _readings;

    public SpeedCalculator(int windowSize = 5)
    {
        _windowSize = windowSize;
        _readings = new ConcurrentQueue<decimal>();
    }

    public void AddReading(decimal speed)
    {
        _readings.Enqueue(speed);
        while (_readings.Count > _windowSize)
        {
            _readings.TryDequeue(out _);
        }
    }

    public decimal GetAverageSpeed()
    {
        if (_readings.IsEmpty) return 0;
        return _readings.Average();
    }
}
