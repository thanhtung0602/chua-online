import * as THREE from "three";

/**
 * Procedural Sculpted 3D Anime Bangs Geometry
 * Tạo khối tóc mái 3D điêu khắc nguyên khối ôm trọn vòm trán,
 * mượt mà chuẩn anime chibi, không bị răng cưa, không dùng ống cylinder thô ráp.
 */
export function createSculptedAnimeBangsGeometry(isFemale: boolean): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const N = 32; // Số lát cắt ngang vòng cung trán
  const M = 4;  // Số phân đoạn dọc từ chân tóc xuống ngọn
  const phiMax = 1.05; // ~60 độ mỗi bên
  const Rhead = 0.33;
  const hairThickTop = 0.022; // Độ dày phồng tự nhiên ở đỉnh
  const hairThickTip = 0.006; // Vuốt mỏng nhẹ ở ngọn

  const positions: number[] = [];
  const indices: number[] = [];

  // Đường viền chân tóc trên trán (Hairline Arch)
  function getThetaTop(phi: number): number {
    return 0.28 * Math.PI - 0.025 * Math.cos(phi * 2);
  }

  // Đường viền đuôi tóc mái (Scalloped Anime Fringe Hemline)
  function getThetaBot(phi: number): number {
    const absPhi = Math.abs(phi);
    if (absPhi > 0.65) {
      // Tóc mai hai bên buông dài ôm gò má V-line
      const templeProgress = (absPhi - 0.65) / (phiMax - 0.65);
      return (isFemale ? 0.44 : 0.42) * Math.PI + templeProgress * 0.17 * Math.PI;
    }

    if (isFemale) {
      // Tóc mái búp bê Chibi Nữ uốn lượn 3 cụm mềm mại
      const wave = Math.sin(phi * 6.2);
      const scallop = 0.035 * Math.PI * (1 - Math.abs(wave));
      return 0.435 * Math.PI + scallop;
    } else {
      // Tóc mái Nam sinh / Đạo đồng vuốt xéo thanh lịch
      const wave = Math.sin(phi * 4.8 - 0.4);
      const scallop = 0.030 * Math.PI * (1 - Math.abs(wave));
      return 0.425 * Math.PI + scallop;
    }
  }

  const numGridVerts = (N + 1) * (M + 1);

  // Layer 0: Mặt ngoài (Outer surface - có độ dày)
  // Layer 1: Mặt trong (Inner surface - áp sát trán)
  for (let layer = 0; layer < 2; layer++) {
    const isOuter = layer === 0;
    for (let j = 0; j <= M; j++) {
      const vProgress = j / M; // 0: đỉnh, 1: ngọn
      for (let i = 0; i <= N; i++) {
        const uProgress = i / N;
        const phi = -phiMax + 2 * phiMax * uProgress;
        const thTop = getThetaTop(phi);
        const thBot = getThetaBot(phi);
        const theta = thTop + (thBot - thTop) * vProgress;

        const thick = hairThickTop * (1 - vProgress) + hairThickTip * vProgress;
        const r = isOuter ? Rhead + thick : Rhead + 0.003;

        // Tọa độ cầu sang Descartes (+Z là chính diện, +X là bên phải, +Y là hướng lên)
        const x = r * Math.sin(theta) * Math.sin(phi);
        const y = r * Math.cos(theta);
        const z = r * Math.sin(theta) * Math.cos(phi);

        positions.push(x, y, z);
      }
    }
  }

  // Mặt ngoài (Outer Surface - CCW winding)
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i;
      const b = j * (N + 1) + (i + 1);
      const c = (j + 1) * (N + 1) + i;
      const d = (j + 1) * (N + 1) + (i + 1);
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // Mặt trong (Inner Surface - CW winding để hướng pháp tuyến vào trong)
  const innerOffset = numGridVerts;
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const a = innerOffset + j * (N + 1) + i;
      const b = innerOffset + j * (N + 1) + (i + 1);
      const c = innerOffset + (j + 1) * (N + 1) + i;
      const d = innerOffset + (j + 1) * (N + 1) + (i + 1);
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // Viền dưới (Bottom Rim - ngọn tóc)
  for (let i = 0; i < N; i++) {
    const oA = M * (N + 1) + i;
    const oB = M * (N + 1) + (i + 1);
    const iA = innerOffset + M * (N + 1) + i;
    const iB = innerOffset + M * (N + 1) + (i + 1);
    indices.push(oA, oB, iA);
    indices.push(oB, iB, iA);
  }

  // Viền trên (Top Rim - tiếp giáp vòm tóc)
  for (let i = 0; i < N; i++) {
    const oA = i;
    const oB = i + 1;
    const iA = innerOffset + i;
    const iB = innerOffset + i + 1;
    indices.push(oA, iA, oB);
    indices.push(oB, iA, iB);
  }

  // Mép hai bên (Left & Right Edges)
  for (let j = 0; j < M; j++) {
    // Mép trái (i = 0)
    const loA = j * (N + 1);
    const loB = (j + 1) * (N + 1);
    const liA = innerOffset + j * (N + 1);
    const liB = innerOffset + (j + 1) * (N + 1);
    indices.push(loA, liA, loB);
    indices.push(loB, liA, liB);

    // Mép phải (i = N)
    const roA = j * (N + 1) + N;
    const roB = (j + 1) * (N + 1) + N;
    const riA = innerOffset + j * (N + 1) + N;
    const riB = innerOffset + (j + 1) * (N + 1) + N;
    indices.push(roA, roB, riA);
    indices.push(roB, riB, riA);
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Tạo Texture Khuôn Mặt Chibi Anime Cao Cấp 2048x1024
 * Tỉ lệ vàng anime chibi chuẩn Nendoroid:
 * Mắt to tròn long lanh, má đào ửng hồng, nụ cười hoan hỷ an lạc.
 */
export function createExpressiveFaceTexture(gender: "male" | "female" = "male"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  const isFemale = gender === "female";

  // 1. Làn da Chibi trắng hồng ấm áp (#fff6ef)
  ctx.fillStyle = "#fff6ef";
  ctx.fillRect(0, 0, 2048, 1024);

  // Tâm diện mạo (+Z trên hình cầu Three.js) ứng với X = 512, Y = 512
  const faceCenterX = 512;
  const eyeCenterY = 505;
  const eyeOffset = 118; // Khoảng cách tâm mắt ra hai bên
  const leftEyeX = faceCenterX + eyeOffset;   // Mắt bên trái người xem (player left / viewer right: X=630)
  const rightEyeX = faceCenterX - eyeOffset;  // Mắt bên phải người xem (player right / viewer left: X=394)

  // Vùng sáng ấm áp quanh khuôn mặt (Warm diffuse facial glow)
  const faceGlow = ctx.createRadialGradient(faceCenterX, eyeCenterY + 25, 30, faceCenterX, eyeCenterY + 25, 340);
  faceGlow.addColorStop(0, "rgba(255, 235, 222, 0.55)");
  faceGlow.addColorStop(0.65, "rgba(255, 225, 212, 0.22)");
  faceGlow.addColorStop(1, "rgba(255, 246, 239, 0)");
  ctx.fillStyle = faceGlow;
  ctx.beginPath();
  ctx.arc(faceCenterX, eyeCenterY + 25, 340, 0, Math.PI * 2);
  ctx.fill();

  // 2. Má đào ửng hồng Chibi (Airbrushed Rosy Blush)
  const drawBlush = (cx: number, cy: number, isLeft: boolean) => {
    const blushRad = isFemale ? 76 : 64;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, blushRad);
    if (isFemale) {
      grad.addColorStop(0, "rgba(255, 95, 135, 0.72)");
      grad.addColorStop(0.5, "rgba(255, 145, 175, 0.40)");
      grad.addColorStop(1, "rgba(255, 246, 239, 0)");
    } else {
      grad.addColorStop(0, "rgba(255, 120, 135, 0.62)");
      grad.addColorStop(0.5, "rgba(255, 165, 175, 0.32)");
      grad.addColorStop(1, "rgba(255, 246, 239, 0)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, blushRad, 0, Math.PI * 2);
    ctx.fill();

    // Vạch thẹn thùng anime dễ thương (///)
    ctx.strokeStyle = isFemale ? "rgba(245, 65, 115, 0.75)" : "rgba(235, 85, 110, 0.65)";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 10); ctx.lineTo(cx - 8, cy + 10);
    ctx.moveTo(cx - 4, cy - 10);  ctx.lineTo(cx + 4, cy + 10);
    ctx.moveTo(cx + 8, cy - 10);  ctx.lineTo(cx + 16, cy + 10);
    ctx.stroke();

    if (isFemale) {
      // Đốm sao lấp lánh trên má anime nữ
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx + (isLeft ? 18 : -18), cy - 16, 3.5, 0, Math.PI * 2);
      ctx.arc(cx - (isLeft ? 16 : -16), cy + 14, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  drawBlush(leftEyeX + 36, eyeCenterY + 75, true);
  drawBlush(rightEyeX - 36, eyeCenterY + 75, false);

  // 3. Lông mày thanh tú, hiền từ (Serene Arched Eyebrows)
  ctx.strokeStyle = "#463228";
  ctx.lineWidth = isFemale ? 5.5 : 6.5;
  ctx.lineCap = "round";

  // Mày trái (viewer right)
  ctx.beginPath();
  ctx.moveTo(leftEyeX - 44, eyeCenterY - 110);
  ctx.quadraticCurveTo(leftEyeX + 8, eyeCenterY - (isFemale ? 132 : 128), leftEyeX + 54, eyeCenterY - 108);
  ctx.stroke();

  // Mày phải (viewer left)
  ctx.beginPath();
  ctx.moveTo(rightEyeX + 44, eyeCenterY - 110);
  ctx.quadraticCurveTo(rightEyeX - 8, eyeCenterY - (isFemale ? 132 : 128), rightEyeX - 54, eyeCenterY - 108);
  ctx.stroke();

  // 4. Nốt Chu Sa Cát Tường / Bạch Hào Quang Phật Giáo (Auspicious Zen Tilaka)
  ctx.fillStyle = isFemale ? "#e11d48" : "#d97706";
  ctx.beginPath();
  ctx.arc(faceCenterX, eyeCenterY - 88, isFemale ? 4.5 : 4.0, 0, Math.PI * 2);
  ctx.fill();

  // 5. ĐÔI MẮT ANIME TO TRÒN LUNG LINH (Chibi Anime Sparkling Eyes)
  const drawEye = (cx: number, cy: number, isViewerRight: boolean) => {
    const ew = 80;  // Bán kính ngang
    const eh = 108; // Bán kính dọc

    // Tròng trắng mắt
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx, cy, ew, eh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bóng đổ mi mắt trên
    ctx.fillStyle = "rgba(185, 198, 218, 0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 32, ew - 4, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tròng mắt chuyển sắc đa tầng (Gradient Iris)
    const irisGrad = ctx.createLinearGradient(cx, cy - eh, cx, cy + eh);
    if (isFemale) {
      irisGrad.addColorStop(0, "#160826");   // Tím thẫm huyền ảo
      irisGrad.addColorStop(0.35, "#3b1e68");
      irisGrad.addColorStop(0.68, "#8b5cf6"); // Tím hoa sen lung linh
      irisGrad.addColorStop(0.92, "#c084fc");
      irisGrad.addColorStop(1, "#f3e8ff");   // Phản quang cánh sen dịu dàng
    } else {
      irisGrad.addColorStop(0, "#081728");   // Xanh lam ngọc thẫm
      irisGrad.addColorStop(0.35, "#103c68");
      irisGrad.addColorStop(0.68, "#0284c7"); // Xanh ngọc bích
      irisGrad.addColorStop(0.92, "#38bdf8");
      irisGrad.addColorStop(1, "#e0f2fe");
    }

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, ew - 8, eh - 8, 0, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = irisGrad;
    ctx.fill();

    // Đồng tử sâu thẳm
    ctx.fillStyle = "#070c14";
    ctx.beginPath();
    ctx.arc(cx, cy + 12, 28, 0, Math.PI * 2);
    ctx.fill();

    // Vòng sáng hồ quang phản chiếu đáy mắt
    ctx.strokeStyle = isFemale ? "rgba(240, 215, 255, 0.88)" : "rgba(185, 245, 255, 0.85)";
    ctx.lineWidth = 5.0;
    ctx.beginPath();
    ctx.arc(cx, cy + 32, 34, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();

    ctx.restore();

    // Viền mí mắt trên dày đậm phong cách Anime
    ctx.strokeStyle = "#1a1210";
    ctx.lineWidth = isFemale ? 10.0 : 8.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 6, ew + 6, eh - 14, 0, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();

    // Đuôi mắt cong nhẹ duyên dáng (hướng ra ngoài thái dương)
    ctx.lineWidth = isFemale ? 6.5 : 5.5;
    const tailDir = isViewerRight ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx + tailDir * (ew - 4), cy - 14);
    ctx.lineTo(cx + tailDir * (ew + (isFemale ? 18 : 12)), cy - (isFemale ? 26 : 18));
    ctx.stroke();

    // Hàng mi cong vút cho Tín Nữ
    if (isFemale) {
      ctx.strokeStyle = "#1a1210";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      // Mi cong chính
      ctx.moveTo(cx + tailDir * (ew + 6), cy - 20);
      ctx.quadraticCurveTo(cx + tailDir * (ew + 22), cy - 30, cx + tailDir * (ew + 26), cy - 40);
      // Mi phụ dưới
      ctx.moveTo(cx + tailDir * (ew + 8), cy - 10);
      ctx.quadraticCurveTo(cx + tailDir * (ew + 20), cy - 16, cx + tailDir * (ew + 24), cy - 22);
      ctx.stroke();
    }

    // Mí mắt đôi nhẹ nhàng phía trên
    ctx.strokeStyle = "rgba(120, 80, 60, 0.4)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy - eh + 14, ew - 10, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Đốm sáng phản quang chính (Primary Specular Star)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx - 20, cy - 26, isFemale ? 18 : 16, isFemale ? 26 : 22, -0.22, 0, Math.PI * 2);
    ctx.fill();

    // Đốm sáng phụ lấp lánh (Secondary Highlight)
    ctx.beginPath();
    ctx.arc(cx + 20, cy + 24, isFemale ? 9.5 : 8.0, 0, Math.PI * 2);
    ctx.fill();

    // Hạt tinh thể phản chiếu li ti
    ctx.beginPath();
    ctx.arc(cx - 24, cy + 12, 4.0, 0, Math.PI * 2);
    ctx.fill();
  };

  drawEye(leftEyeX, eyeCenterY, true);
  drawEye(rightEyeX, eyeCenterY, false);

  // 6. Mũi Chibi nhỏ nhắn đáng yêu
  ctx.fillStyle = "#df8a68";
  ctx.beginPath();
  ctx.arc(faceCenterX, eyeCenterY + 46, isFemale ? 3.5 : 4.0, 0, Math.PI * 2);
  ctx.fill();

  // 7. Nụ cười an nhiên hoan hỷ (Sweet Serene Smile)
  ctx.strokeStyle = isFemale ? "#a82046" : "#8b263e";
  ctx.lineWidth = isFemale ? 5.5 : 5.0;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(faceCenterX, eyeCenterY + 86, isFemale ? 22 : 24, 0.16 * Math.PI, 0.84 * Math.PI);
  ctx.stroke();

  // Khóe môi hồng chúm chím
  ctx.fillStyle = isFemale ? "#ff4081" : "#ff6b81";
  ctx.beginPath();
  ctx.arc(faceCenterX, eyeCenterY + 95, isFemale ? 11 : 10, 0, Math.PI);
  ctx.fill();

  if (isFemale) {
    // Điểm sáng bóng môi (Lip gloss shine)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.ellipse(faceCenterX, eyeCenterY + 98, 6.0, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
