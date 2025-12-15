"use client";

import { useEffect, useState, useRef } from "react";

interface ChartWrapperProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
  dynamicYAxis?: boolean;
}

export default function ChartWrapper({
  data,
  layout = {},
  config = {},
  className,
  dynamicYAxis = false,
}: ChartWrapperProps) {
  const [Plotly, setPlotly] = useState<any>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const isRelayoutingRef = useRef(false);

  useEffect(() => {
    import("plotly.js").then((module) => setPlotly(module.default));
  }, []);

  useEffect(() => {
    if (!Plotly || !plotRef.current || !data || !data.length) return;

    // Compute global X min/max for pan limits
    const allX: Date[] = [];
    data.forEach((trace) => {
      if (!trace.x) return;
      trace.x.forEach((d: string) => allX.push(new Date(d)));
    });
    const minDate = new Date(Math.min(...allX.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allX.map((d) => d.getTime())));

    // Function to dynamically rescale Y based on current X range
    const relayoutYAxis = (x0?: Date, x1?: Date) => {
      if (!dynamicYAxis || isRelayoutingRef.current) return;

      const gd = plotRef.current!;
      const currentX0 =
        (x0 ?? (gd as any)._fullLayout?.xaxis.range)
          ? new Date((gd as any)._fullLayout.xaxis.range[0])
          : minDate;
      const currentX1 =
        (x1 ?? (gd as any)._fullLayout?.xaxis.range)
          ? new Date((gd as any)._fullLayout.xaxis.range[1])
          : maxDate;

      // Clamp to dataset bounds
      const clampX0 = currentX0 < minDate ? minDate : currentX0;
      const clampX1 = currentX1 > maxDate ? maxDate : currentX1;

      const visibleY: number[] = [];
      data.forEach((trace) => {
        if (!trace.x || !trace.y) return;
        trace.x.forEach((d: string, i: number) => {
          const date = new Date(d);
          if (date >= clampX0 && date <= clampX1) visibleY.push(trace.y[i]);
        });
      });

      if (visibleY.length) {
        const yMin = Math.min(...visibleY);
        const yMax = Math.max(...visibleY);
        const padding = (yMax - yMin) * 0.1 || 1;

        isRelayoutingRef.current = true;
        Plotly.relayout(gd, { "yaxis.range": [yMin - padding, yMax + padding] }).then(() => {
          isRelayoutingRef.current = false;
        });
      }
    };

    // Merge default layout and config
    const defaultLayout = {
      paper_bgcolor: "#161b22",
      plot_bgcolor: "#161b22",
      font: { family: "Inter, sans-serif", color: "#c9d1d9", size: 12 },
      dragmode: "pan",
      xaxis: {
        showgrid: true,
        gridcolor: "rgba(255,255,255,0.05)",
        zeroline: false,
        fixedrange: false,
        rangeslider: { visible: false },
        ...layout.xaxis,
      },
      yaxis: {
        showgrid: true,
        gridcolor: "rgba(255,255,255,0.05)",
        zeroline: false,
        fixedrange: true,
        ...layout.yaxis,
      },
      ...layout,
    };

    const defaultConfig = {
      responsive: true,
      displayModeBar: false,
      scrollZoom: false,
      doubleClick: true,
      staticPlot: false,
      ...config,
    };

    // Create the Plotly chart
    Plotly.newPlot(plotRef.current, data, defaultLayout, defaultConfig).then((gd: any) => {
      // Initial Y-axis rescale
      relayoutYAxis();

      // Listen for relayout events (pan/zoom/range selector buttons)
      gd.on("plotly_relayout", (event: any) => {
        if (isRelayoutingRef.current) return; // Prevent recursive calls

        let x0: Date | undefined;
        let x1: Date | undefined;
        let shouldClamp = false;

        if (event["xaxis.range[0]"] && event["xaxis.range[1]"]) {
          // Pan / zoom
          x0 = new Date(event["xaxis.range[0]"]);
          x1 = new Date(event["xaxis.range[1]"]);
          shouldClamp = true;
        } else if (event["xaxis.autorange"]) {
          // Range selector button click
          const lastButton = gd._fullLayout.xaxis._rangeselector?.active;
          const button = gd._fullLayout.xaxis.rangeselector?.buttons[lastButton];
          if (button && button.count && button.step) {
            const now = maxDate;
            x0 = new Date(now);
            switch (button.step) {
              case "month":
                x0.setMonth(now.getMonth() - button.count);
                break;
              case "year":
                x0.setFullYear(now.getFullYear() - button.count);
                break;
              case "day":
                x0.setDate(now.getDate() - button.count);
                break;
            }
            x1 = now;
            isRelayoutingRef.current = true;
            Plotly.relayout(gd, { "xaxis.range": [x0, x1] }).then(() => {
              isRelayoutingRef.current = false;
              relayoutYAxis(x0, x1);
            });
            return;
          }
        }

        // Clamp pan to dataset bounds
        if (shouldClamp && x0 && x1) {
          const needsClamp = x0 < minDate || x1 > maxDate;
          if (needsClamp) {
            if (x0 < minDate) x0 = minDate;
            if (x1 > maxDate) x1 = maxDate;
            isRelayoutingRef.current = true;
            Plotly.relayout(gd, { "xaxis.range": [x0, x1] }).then(() => {
              isRelayoutingRef.current = false;
              relayoutYAxis(x0, x1);
            });
            return;
          }
        }

        // Rescale Y-axis for current X range
        if (x0 && x1) {
          relayoutYAxis(x0, x1);
        }
      });
    });

    const handleResize = () => Plotly.Plots.resize(plotRef.current!);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [Plotly, data, layout, config, dynamicYAxis]);

  if (!Plotly) {
    return (
      <div
        className={`${className} bg-dark-card border border-dark-border rounded-lg flex items-center justify-center`}
        style={{ minHeight: 400 }}
      >
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return <div ref={plotRef} className={`${className} w-full`} style={{ minHeight: 400 }} />;
}
