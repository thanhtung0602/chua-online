/**
 * SpeechBubble.ts - Bong bóng thoại 3D hiển thị chat & thông báo trên đầu nhân vật
 * Tự động tính toán kích thước động, ngắt dòng thông minh, hiển thị đầy đủ 100% nội dung
 * Sử dụng THREE.Sprite với CanvasTexture độ phân giải cao
 */

import * as THREE from "three";

export class SpeechBubbleManager {
  private bubbles: { sprite: THREE.Sprite; expiresAt: number; followTarget: THREE.Object3D }[] = [];

  constructor(_scene: THREE.Scene) {
    // Scene reference kept for future expansion
  }

  /**
   * Hiển thị bong bóng chat phía trên một đối tượng 3D
   */
  public show(target: THREE.Object3D, text: string, duration?: number) {
    if (!text || text.trim().length === 0) return;

    // Thời gian hiển thị thích ứng theo độ dài câu
    const actualDuration = duration || Math.max(4800, Math.min(8500, 2500 + text.length * 60));

    // 1. Dọn dẹp bong bóng cũ của đối tượng này nếu đang hiển thị (tránh chồng chéo chữ)
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (this.bubbles[i].followTarget === target) {
        const old = this.bubbles[i];
        old.followTarget.remove(old.sprite);
        old.sprite.material.dispose();
        (old.sprite.material as THREE.SpriteMaterial).map?.dispose();
        this.bubbles.splice(i, 1);
      }
    }

    // 2. Chọn cỡ chữ và khoảng cách dòng thích ứng theo độ dài văn bản
    const len = text.length;
    let fontSize = 26;
    let lineHeight = 35;
    let maxTextWidth = 520;

    if (len <= 30) {
      fontSize = 28;
      lineHeight = 37;
      maxTextWidth = 460;
    } else if (len <= 70) {
      fontSize = 25;
      lineHeight = 34;
      maxTextWidth = 520;
    } else if (len <= 110) {
      fontSize = 23;
      lineHeight = 32;
      maxTextWidth = 560;
    } else {
      fontSize = 21;
      lineHeight = 30;
      maxTextWidth = 580;
    }

    // Canvas tạm để đo kích thước chữ chính xác
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d")!;
    measureCtx.font = `bold ${fontSize}px 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

    // 3. Phân tách dòng thông minh theo từ (Word Wrap)
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = measureCtx.measureText(testLine).width;

      if (testWidth > maxTextWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Đo bề rộng lớn nhất trong các dòng
    let maxLineWidth = 0;
    for (const l of lines) {
      const w = measureCtx.measureText(l).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }

    // 4. Tính toán kích thước Canvas và Bong bóng thực tế
    const paddingX = 26;
    const paddingY = 16;
    const tailHeight = 18;
    const tailWidth = 24;

    const bubbleWidth = Math.max(160, Math.ceil(maxLineWidth + paddingX * 2));
    const bubbleHeight = Math.ceil(lines.length * lineHeight + paddingY * 2);

    const canvasWidth = bubbleWidth + 24; // Chừa lề cho đổ bóng và viền
    const canvasHeight = bubbleHeight + tailHeight + 12;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d")!;

    const bubbleX = 12;
    const bubbleY = 6;
    const radius = 16;
    const centerX = canvasWidth / 2;

    // 5. Vẽ Thân Bong Bóng (Nền thiền tối cao cấp + Viền vàng kim sắc sảo)
    ctx.save();
    // Đổ bóng nhẹ phía sau khung bong bóng
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Nền thân bong bóng
    ctx.fillStyle = "rgba(10, 18, 14, 0.96)";
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, radius);
    ctx.fill();

    // Mũi tên trỏ xuống nhân vật
    const tailTop = bubbleY + bubbleHeight;
    const tailBottom = tailTop + tailHeight;
    ctx.beginPath();
    ctx.moveTo(centerX - tailWidth / 2, tailTop - 1.5);
    ctx.lineTo(centerX, tailBottom);
    ctx.lineTo(centerX + tailWidth / 2, tailTop - 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Viền vàng kim tinh tế bo quanh thân bong bóng
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, radius);
    ctx.stroke();

    // Viền vàng kim cho mũi tên
    ctx.beginPath();
    ctx.moveTo(centerX - tailWidth / 2, tailTop);
    ctx.lineTo(centerX, tailBottom);
    ctx.lineTo(centerX + tailWidth / 2, tailTop);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#f1c40f";
    ctx.stroke();

    // 6. Vẽ toàn bộ các dòng chữ (100% hiển thị đầy đủ mọi dòng, không bị cắt xén)
    ctx.font = `bold ${fontSize}px 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    const startY = bubbleY + paddingY + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      const yPos = startY + i * lineHeight;

      // Viền đen dày dặn bảo đảm siêu tương phản trong mọi môi trường ánh sáng
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
      ctx.strokeText(lines[i], centerX, yPos);

      // Chữ trắng tinh khôi thanh tịnh
      ctx.fillStyle = "#ffffff";
      ctx.fillText(lines[i], centerX, yPos);
    }

    // 7. Tạo Three.js Sprite
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);

    // Kích thước thế giới thực tỉ lệ chuẩn
    const baseWorldScale = 0.0065; // 1px canvas ≈ 0.0065m trong không gian 3D
    const worldWidth = canvasWidth * baseWorldScale;
    const worldHeight = canvasHeight * baseWorldScale;
    sprite.scale.set(worldWidth, worldHeight, 1);

    // Neo chân mũi tên tại Y = 2.80m (ngay trên đỉnh Nametag y = 2.45m), khung chữ mở rộng lên phía trên
    sprite.center.set(0.5, 0.0);
    sprite.position.set(0, 2.80, 0);

    target.add(sprite);

    const expiresAt = performance.now() + actualDuration;
    this.bubbles.push({ sprite, expiresAt, followTarget: target });
  }

  /**
   * Gọi mỗi frame để dọn dẹp bong bóng hết hạn
   */
  public update() {
    const now = performance.now();
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      const remaining = b.expiresAt - now;

      // Fade out 500ms cuối
      if (remaining < 500) {
        (b.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, remaining / 500);
      }

      if (remaining <= 0) {
        b.followTarget.remove(b.sprite);
        b.sprite.material.dispose();
        (b.sprite.material as THREE.SpriteMaterial).map?.dispose();
        this.bubbles.splice(i, 1);
      }
    }
  }
}
