using Xunit;
using PrintingIoT.Worker.Services;
using System.Collections.Generic;
using System.Linq;

namespace PrintingIoT.Tests;

public class SpeedCalculatorTests
{
    [Fact]
    public void CalculateAverageSpeed_ShouldReturnCorrectAverage()
    {
        // Arrange
        var calculator = new SpeedCalculator(windowSize: 5);
        var inputs = new [] { 10, 20, 30, 40, 50 };

        // Act
        foreach(var input in inputs)
        {
            calculator.AddReading(input);
        }
        var average = calculator.GetAverageSpeed();

        // Assert
        Assert.Equal(30, average);
    }

    [Fact]
    public void CalculateAverageSpeed_ShouldHandleEmpty()
    {
        var calculator = new SpeedCalculator();
        Assert.Equal(0, calculator.GetAverageSpeed());
    }
}
