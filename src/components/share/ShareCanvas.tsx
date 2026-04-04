"use client";

import { useEffect, useRef } from "react";

import type { SharePayload } from "@/lib/share/share";

const BRAND_MARK_PATH = "/brand/maguromaru-mark.png";

function drawShareCanvas(
  context: CanvasRenderingContext2D,
  markImage: HTMLImageElement | null,
  payload: SharePayload,
) {
  const width = 600;
  const height = 315;
  context.clearRect(0, 0, width, height);

  context.fillStyle = "#0d0805";
  context.fillRect(0, 0, width, height);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#2a1510");
  background.addColorStop(1, "#0d0805");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#cc2222";
  context.fillRect(0, 0, width, 5);

  if (markImage) {
    context.save();
    context.beginPath();
    context.arc(48, 48, 22, 0, Math.PI * 2);
    context.closePath();
    context.clip();
    const s = 46;
    context.drawImage(markImage, 48 - s / 2, 48 - s / 2, s, s);
    context.restore();
  } else {
    context.beginPath();
    context.arc(48, 48, 22, 0, Math.PI * 2);
    context.fillStyle = "#cc2222";
    context.fill();

    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.font = '900 11px "Noto Sans JP", sans-serif';
    context.fillText("まぐろ", 48, 44);
    context.fillText("丸", 48, 56);
  }

  context.textAlign = "left";
  context.fillStyle = "#f5e6c8";
  context.font = '900 22px "Noto Sans JP", sans-serif';
  context.fillText("まぐろ丸ノート", 88, 42);
  context.fillStyle = "#c4a878";
  context.font = '400 11px "Noto Sans JP", sans-serif';
  context.fillText("海鮮丼まぐろ丸（本町）", 88, 58);

  context.strokeStyle = "#cc2222";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(24, 78);
  context.lineTo(width - 24, 78);
  context.stroke();

  context.fillStyle = "#f5e6c8";
  context.font = '700 15px "Noto Sans JP", sans-serif';
  const lines = payload.text
    .split("\n")
    .filter(Boolean)
    .slice(0, 4);
  let y = 108;
  for (const line of lines) {
    const clipped = line.length > 28 ? `${line.slice(0, 27)}…` : line;
    context.fillText(clipped, 28, y);
    y += 26;
  }

  context.fillStyle = "#c4a878";
  context.font = '400 13px "Noto Sans JP", sans-serif';
  context.textAlign = "center";
  context.fillText("🐟 まぐろ丸ノート ─ 海鮮丼まぐろ丸（本町）", width / 2, height - 22);
}

export function ShareCanvas({ payload }: { payload: SharePayload }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => {
      drawShareCanvas(context, img, payload);
    };
    img.onerror = () => {
      drawShareCanvas(context, null, payload);
    };
    img.src = BRAND_MARK_PATH;
  }, [payload]);

  return (
    <div className="canvas-preview-wrap">
      <canvas height={315} ref={canvasRef} width={600} />
    </div>
  );
}
