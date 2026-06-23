"use client";

import { useRef, useEffect } from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
  height?: number;
  type?: "line" | "bar";
  showLabels?: boolean;
  formatValue?: (v: number) => string;
}

export default function MiniChart({
  data,
  color = "hsl(var(--primary))",
  height = 200,
  type = "line",
  showLabels = true,
  formatValue = (v) => v.toLocaleString(),
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const paddingTop = 20;
    const paddingBottom = showLabels ? 40 : 10;
    const paddingLeft = 10;
    const paddingRight = 10;

    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    const maxVal = Math.max(...data.map((d) => d.value), 1);

    ctx.clearRect(0, 0, w, h);

    if (type === "bar") {
      const barGap = 4;
      const barWidth = Math.max(
        2,
        (chartW - barGap * (data.length - 1)) / data.length
      );

      data.forEach((point, i) => {
        const x =
          paddingLeft + i * (barWidth + barGap);
        const barH = (point.value / maxVal) * chartH;
        const y = paddingTop + chartH - barH;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (showLabels && i % Math.ceil(data.length / 6) === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            point.label.slice(0, 3),
            x + barWidth / 2,
            h - 8
          );
        }
      });
    } else {
      const stepX = chartW / Math.max(data.length - 1, 1);

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartH);
      gradient.addColorStop(0, color.replace(")", ", 0.3)").replace("hsl(", "hsla(").replace("rgb(", "rgba("));
      gradient.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.moveTo(paddingLeft, paddingTop + chartH);

      data.forEach((point, i) => {
        const x = paddingLeft + i * stepX;
        const y = paddingTop + chartH - (point.value / maxVal) * chartH;
        if (i === 0) ctx.lineTo(x, y);
        else {
          const prevX = paddingLeft + (i - 1) * stepX;
          const prevY =
            paddingTop +
            chartH -
            (data[i - 1].value / maxVal) * chartH;
          const cpx = (prevX + x) / 2;
          ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
        }
      });

      ctx.lineTo(paddingLeft + (data.length - 1) * stepX, paddingTop + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Line
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = paddingLeft + i * stepX;
        const y = paddingTop + chartH - (point.value / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prevX = paddingLeft + (i - 1) * stepX;
          const prevY =
            paddingTop +
            chartH -
            (data[i - 1].value / maxVal) * chartH;
          const cpx = (prevX + x) / 2;
          ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
        }
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots
      data.forEach((point, i) => {
        const x = paddingLeft + i * stepX;
        const y = paddingTop + chartH - (point.value / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      // Labels
      if (showLabels) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        const step = Math.ceil(data.length / 6);
        data.forEach((point, i) => {
          if (i % step === 0 || i === data.length - 1) {
            const x = paddingLeft + i * stepX;
            ctx.fillText(point.label.slice(0, 3), x, h - 8);
          }
        });
      }
    }
  }, [data, color, height, type, showLabels, formatValue]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  return <canvas ref={canvasRef} className="w-full" style={{ height }} />;
}
