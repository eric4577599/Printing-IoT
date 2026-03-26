using System;
using System.Diagnostics;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace PrintingIoT.StressTest
{
    class Program
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private static int _requestCount = 0;
        private static int _errorCount = 0;
        private static bool _isRunning = true;

        static async Task Main(string[] args)
        {
            Console.WriteLine("=== Flexo IoT Stress Test Tool (API Only) ===");
            Console.WriteLine("Target API: http://localhost:5200");
            Console.WriteLine("Duration: 60 seconds");
            Console.WriteLine("Concurrency: 50 clients");
            Console.WriteLine("----------------------------------");

            // Start API Flooder
            var apiTask = Task.Run(ApiFloodLoop);

            // Run for 60 seconds
            await Task.Delay(TimeSpan.FromSeconds(60));
            _isRunning = false;

            Console.WriteLine("\nStopping tests...");
            await Task.WhenAll(apiTask);

            Console.WriteLine("----------------------------------");
            Console.WriteLine($"Total API Requests: {_requestCount}");
            Console.WriteLine($"Total API Errors:   {_errorCount}");
            Console.WriteLine($"Avg RPS:            {_requestCount / 60.0:F2} req/sec");
            Console.WriteLine("----------------------------------");
            if (_errorCount > 0) Console.WriteLine("WARNING: Errors detected during stress test.");
            Console.WriteLine("Test Completed.");
        }

        static async Task ApiFloodLoop()
        {
            int concurrency = 50;
            var tasks = new Task[concurrency];

            for (int i = 0; i < concurrency; i++)
            {
                tasks[i] = Task.Run(async () =>
                {
                    while (_isRunning)
                    {
                        try
                        {
                            var sw = Stopwatch.StartNew();
                            var response = await _httpClient.GetAsync("http://localhost:5200/api/monitor/realtime");
                            sw.Stop();

                            if (response.IsSuccessStatusCode)
                            {
                                Interlocked.Increment(ref _requestCount);
                            }
                            else
                            {
                                Interlocked.Increment(ref _errorCount);
                            }
                        }
                        catch
                        {
                            Interlocked.Increment(ref _errorCount);
                        }
                        await Task.Delay(10); 
                    }
                });
            }

            await Task.WhenAll(tasks);
        }
    }
}
