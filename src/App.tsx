"use client";
import { useEffect, useRef, useState } from "react";
import * as Highcharts from "highcharts";
import { HighchartsReact } from "highcharts-react-official";
export const GRID_LINE_COLOR = "rgba(255, 255, 255, 0.08)";
export const LINE_COLOR = "rgba(204, 253, 7, 1)";
export const AXIS_TEXT_COLOR = "#9da4ae";
export const PLOT_LINE_COLOR = "#fd853a";

export const INTERVAL = {
  NORMAL: 1000,
  SMOOTH: 250,
};

export function App() {
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [currentPrice, setCurrentPrice] = useState<number>();
  const [intervalTime] = useState<number>(INTERVAL.NORMAL);
  const [currentPlotLine, setCurrentPlotLine] = useState<number | null>(null);
  const [endPlotLine, setEndPlotLine] = useState<number | null>(null);
  const [currentYPlotLine, setCurrentYPlotLine] = useState<number | null>(null);

  const [options, setOptions] = useState<Highcharts.Options>({
    title: {
      text: undefined,
    },
    chart: {
      backgroundColor: "#111927",
      type: "spline",
      animation: true,
      width: 800,
    },
    series: [
      {
        type: "spline",
        data: [],
        color: LINE_COLOR,
        marker: {
          enabled: false,
          radius: 4,
          symbol: "circle",
        },
      },
    ],
    credits: {
      enabled: false,
    },
    xAxis: {
      type: "datetime",
      labels: {
        format: "{value:%H:%M:%S}",
        style: { color: AXIS_TEXT_COLOR },
      },
      gridLineWidth: 1,
      gridLineColor: GRID_LINE_COLOR,
      tickInterval: 10000,
      zoomEnabled: true,
    },
    yAxis: {
      title: {
        text: undefined,
      },
      opposite: true,
      labels: {
        style: { color: AXIS_TEXT_COLOR },
      },
      gridLineColor: GRID_LINE_COLOR,
    },
    rangeSelector: {
      selected: 1,
    },
    legend: {
      enabled: false,
    },
    navigator: {
      enabled: true,
    },
  });

  useEffect(() => {
    const fetchHistoricalPrices = async () => {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1s&limit=65`
      );
      const data = await response.json();
      return data.map((candle: any) => ({
        x: candle[0],
        y: parseFloat(candle[4]), // Closing price
      }));
    };
    const initialChartData = fetchHistoricalPrices();
    initialChartData.then((data) =>
      setOptions({ ...options, series: [{ type: "spline", data }] })
    );
  }, []);

  useEffect(() => {
    const updateChart = async () => {
      const chart = chartComponentRef.current?.chart;
      if (chart) {
        const mainSeries = chart.series[0];
        const x = new Date().getTime();
        const price = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
        );
        const json = await price.json();
        const y = price?.ok ? parseFloat(json.price) : currentPrice ?? 0;

        if (mainSeries.data.length > 66) {
          mainSeries.data[0].remove(false, false);
        }

        if (mainSeries.data.length > 0) {
          const prevPoint = mainSeries.data[mainSeries.data.length - 1];
          prevPoint.update({ marker: { enabled: false } }, false);
        }

        const newPoint = {
          x,
          y,
          marker: {
            enabled: true,
            radius: 4,
            symbol: "circle",
            fillColor: y > (currentYPlotLine ?? 0) ? "#00ff00" : "#ff0000",
          },
        };

        mainSeries.addPoint(newPoint, false, false);

        if (!currentPlotLine) {
          addPlotLines(chart, x, y);
        } else if (x >= endPlotLine!) {
          updatePlotLines(chart, x, y);
        }

        // Extend x-axis 15 seconds ahead
        const lastDataPoint = mainSeries.data[mainSeries.data.length - 1];
        chart.xAxis[0].setExtremes(undefined, lastDataPoint.x + 15000, false);

        chart.redraw();

        setCurrentPrice(y);
      }
    };

    const interval = setInterval(updateChart, intervalTime);

    return () => clearInterval(interval);
  }, [intervalTime, currentPrice, currentPlotLine, endPlotLine]);

  const addPlotLines = (chart: Highcharts.Chart, x: number, y: number) => {
    chart.xAxis[0].addPlotLine({
      id: "current-x",
      value: x,
      width: 1,
      dashStyle: "Dash",
      label: {
        useHTML: true,
        x: -3,
        text: `<div class="plot-label plot-label-x">Current</div>`,
        style: {
          color: PLOT_LINE_COLOR,
        },
      },
    });

    // Add end x plot line (1 minute ahead)
    const endX = x + 60000;
    chart.xAxis[0].addPlotLine({
      id: "end-x",
      value: endX,
      width: 1,
      dashStyle: "Dash",
      label: {
        useHTML: true,
        x: -3,
        text: `<div class="plot-label plot-label-x">End</div>`,
        style: {
          color: PLOT_LINE_COLOR,
        },
      },
    });

    // Add y plot line
    chart.yAxis[0].addPlotLine({
      id: "current-y",
      value: y,
      width: 1,
      dashStyle: "Dash",
      label: {
        align: "right",
        useHTML: true,
        y: 2,
        x: 50,
        text: `<div class="plot-label">${y.toFixed(2)}</div>`,
        style: {
          color: PLOT_LINE_COLOR,
        },
      },
    });

    setCurrentPlotLine(x);
    setEndPlotLine(endX);
    setCurrentYPlotLine(y);
  };

  const updatePlotLines = (chart: Highcharts.Chart, x: number, y: number) => {
    chart.xAxis[0].removePlotLine("current-x");
    chart.xAxis[0].addPlotLine({
      id: "current-x",
      value: x,
      width: 1,
      dashStyle: "Dash",
      label: {
        useHTML: true,
        x: -3,
        text: `<div class="plot-label plot-label-x">Current</div>`,
        style: {
          color: PLOT_LINE_COLOR,
        },
      },
    });

    const newEndX = x + 60000;
    chart.xAxis[0].removePlotLine("end-x");
    chart.xAxis[0].addPlotLine({
      id: "end-x",
      value: newEndX,
      width: 1,
      dashStyle: "Dash",
      label: {
        useHTML: true,
        x: -3,
        text: `<div class="plot-label plot-label-x">End</div>`,
        style: {
          color: PLOT_LINE_COLOR,
        },
      },
    });

    chart.yAxis[0].removePlotLine("current-y");
    chart.yAxis[0].addPlotLine({
      id: "current-y",
      value: y,
      width: 1,
      dashStyle: "Dash",
      label: {
        align: "right",
        useHTML: true,
        y: -10,
        x: 50,
        text: `<div class="plot-label">${y.toFixed(2)}</div>`,
        style: {
          color: PLOT_LINE_COLOR,
        },
      },
    });

    setCurrentPlotLine(x);
    setEndPlotLine(newEndX);
    setCurrentYPlotLine(y);
  };

  return (
    <main className="flex items-center justify-center pt-16 pb-4 bg-black">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          ref={chartComponentRef}
        />
      </div>
    </main>
  );
}
