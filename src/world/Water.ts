/**
 * Water.ts - Hệ thống Mặt Nước Hồ Sen Chân Thật (Realistic Zen Lotus Pond Water)
 * - Tích hợp Shader PBR nước hồ sen cao cấp:
 *   + Hiệu ứng phản chiếu Fresnel quang học chuẩn xác (phản chiếu bầu trời / ráng chiều / đêm trăng)
 *   + 2 lớp Normal Map đa tầng gợn sóng lăn tăn (Water ripples & Caustics) tạo vân nước chuyển động sống động
 *   + Độ sâu màu nước ngọc bích (Emerald Jade) chuyển tiếp từ nông (Turquoise) xuống sâu (Deep Emerald)
 *   + Ánh kim lấp lánh (Sparkling Sun Glints & Specular Highlights) khi đón ánh sáng mặt trời / ánh trăng
 *   + Phản quang lung linh từ hoa đăng trôi trên mặt nước vào ban đêm
 *   + Lớp hoa văn gợn nước khúc xạ (Underwater Caustics) chiếu rọi lung linh xuống đáy hồ
 *   + Viền bọt nước / mép nước mềm mại ven bờ đá và trụ cầu gỗ
 * - Đảm bảo hiệu năng tối ưu 60 FPS mượt mà cho cả Desktop và Mobile
 */

import * as THREE from "three";

export type WaterTimeMode = "dawn" | "day" | "sunset" | "night";

export class Water {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public causticsMesh: THREE.Mesh;
  public shoreFoamMesh: THREE.Mesh;

  private geometry: THREE.PlaneGeometry;
  private material: THREE.ShaderMaterial;
  private causticsMat: THREE.MeshBasicMaterial;

  private normalTexture: THREE.DataTexture;
  private causticsTexture: THREE.DataTexture;

  constructor(
    width = 24.8,
    length = 10.8,
    posX = 0,
    posY = -0.16,
    posZ = 1.0
  ) {
    this.group = new THREE.Group();
    this.group.name = "realistic_water_system";

    // 1. Sinh Texture Normal Map Gợn Sóng Nước Đa Tầng (Procedural Tileable Water Normals)
    this.normalTexture = this.generateWaterNormalTexture(512, 512);

    // 2. Sinh Texture Hoa Văn Khúc Xạ Đáy Nước (Underwater Caustics Texture)
    this.causticsTexture = this.generateCausticsTexture(256, 256);

    // 3. Khởi tạo Geometry mặt nước với lưới 54x28 cho sóng uốn lượn mềm mại
    this.geometry = new THREE.PlaneGeometry(width, length, 54, 28);
    this.geometry.rotateX(-Math.PI / 2);

    // 4. Shader Mặt Nước Hồ Sen Chân Thật (Độ sâu ngọc bích, phản chiếu trời biếc, lấp lánh ánh kim)
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uNormalTexture: { value: this.normalTexture },
        uDeepColor: { value: new THREE.Color(0x021614) },     // Ngọc bích sâu thẳm đậm đà
        uShallowColor: { value: new THREE.Color(0x0a4a40) },  // Ngọc bích thanh biếc
        uFresnelColor: { value: new THREE.Color(0x56a6ba) },  // Phản chiếu bầu trời biếc
        uSunDirection: { value: new THREE.Vector3(0.45, 0.85, 0.45).normalize() },
        uSunColor: { value: new THREE.Color(0xfffaee) },
        uLanternGlow: { value: new THREE.Color(0xffaa44) },
        uWaterOpacity: { value: 0.94 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // 3 sóng điều hòa tự nhiên cho mặt nước hồ sen tĩnh tại
          float wave1 = sin(pos.x * 0.70 + uTime * 0.95) * 0.024;
          float wave2 = cos(pos.z * 0.95 + uTime * 0.80) * 0.018;
          float wave3 = sin((pos.x * 0.65 + pos.z * 0.90) + uTime * 1.15) * 0.014;
          pos.y += wave1 + wave2 + wave3;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;

          vec4 mvPosition = viewMatrix * worldPos;
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uNormalTexture;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFresnelColor;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform vec3 uLanternGlow;
        uniform float uWaterOpacity;

        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;

        void main() {
          vec3 viewDir = normalize(vViewPosition);

          // 3 tầng Normal Map cuộn trôi đa hướng & đa tỷ lệ
          vec2 uv1 = vUv * vec2(6.5, 3.2) + vec2(uTime * 0.022, uTime * 0.012);
          vec2 uv2 = vUv * vec2(10.5, 5.2) - vec2(uTime * 0.015, uTime * 0.026);
          vec2 uv3 = vUv * vec2(15.0, 7.5) + vec2(uTime * 0.009, -uTime * 0.016);

          vec3 n1 = texture2D(uNormalTexture, uv1).rgb * 2.0 - 1.0;
          vec3 n2 = texture2D(uNormalTexture, uv2).rgb * 2.0 - 1.0;
          vec3 n3 = texture2D(uNormalTexture, uv3).rgb * 2.0 - 1.0;

          // Kết hợp vector pháp tuyến
          vec3 combinedNormal = normalize(n1 * 0.48 + n2 * 0.34 + n3 * 0.18);
          vec3 worldNormal = normalize(vec3(combinedNormal.x, combinedNormal.z * 1.75, combinedNormal.y));

          // 1. Hệ số phản xạ Fresnel (Schlick approximation)
          float cosTheta = clamp(dot(viewDir, worldNormal), 0.0, 1.0);
          float fresnel = 0.08 + (1.0 - 0.08) * pow(1.0 - cosTheta, 4.0);

          // 2. Chuyển tiếp màu nước theo độ sâu
          float depthFactor = clamp((vWorldPosition.y + 0.30) / 0.35, 0.0, 1.0);
          vec3 waterColor = mix(uDeepColor, uShallowColor, depthFactor * 0.70 + 0.30);

          // 3. Ánh kim lấp lánh phản chiếu mặt trời (Sharp Specular & Sun Glints)
          vec3 sunDir = normalize(uSunDirection);
          vec3 halfVec = normalize(sunDir + viewDir);
          float NdotH = max(0.0, dot(worldNormal, halfVec));
          float specular = pow(NdotH, 110.0) * 2.2;
          float sparkles = pow(NdotH, 280.0) * 4.8;

          // 4. Hòa trộn màu nước với ánh sáng bầu trời theo Fresnel
          vec3 finalColor = mix(waterColor, uFresnelColor, fresnel * 0.75);
          finalColor += (specular + sparkles) * uSunColor;

          // 5. Phản quang hoa đăng lung linh
          float lanternReflection = pow(max(0.0, dot(worldNormal, vec3(0.0, 1.0, 0.15))), 12.0);
          finalColor += uLanternGlow * lanternReflection * 0.45;

          // 6. Gợn sáng lượn sóng trên mặt nước (Surface Caustic Highlights)
          float crestCaustics = pow(max(0.0, combinedNormal.y), 4.5) * 0.16;
          finalColor += vec3(crestCaustics) * uShallowColor * 1.5;

          float alpha = mix(uWaterOpacity, 0.98, fresnel);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(posX, posY, posZ);
    this.mesh.receiveShadow = true;
    this.mesh.name = "lotus_pond_water";
    this.group.add(this.mesh);

    // 5. Lớp hoa văn gợn nước khúc xạ lung linh dưới đáy hồ (Underwater Caustics Plane)
    this.causticsMat = new THREE.MeshBasicMaterial({
      map: this.causticsTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x4dd0e1,
    });
    this.causticsMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.98, length * 0.98),
      this.causticsMat
    );
    this.causticsMesh.rotateX(-Math.PI / 2);
    this.causticsMesh.position.set(posX, -0.78, posZ);
    this.group.add(this.causticsMesh);

    // 6. Viền bọt nước & mép nước tiếp giáp chân bờ đá kè (Shoreline Foam Perimeter)
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0x99f6e4,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.shoreFoamMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 1.012, length * 1.018),
      foamMat
    );
    this.shoreFoamMesh.rotateX(-Math.PI / 2);
    this.shoreFoamMesh.position.set(posX, posY + 0.002, posZ);
    this.group.add(this.shoreFoamMesh);
  }

  /**
   * Sinh Texture Normal Map sóng nước gợn đa tầng chân thật (Procedural Normal Map)
   */
  private generateWaterNormalTexture(width: number, height: number): THREE.DataTexture {
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Tọa độ UV lặp tuần hoàn mượt mà
        const u = (x / width) * Math.PI * 4;
        const v = (y / height) * Math.PI * 4;

        // Tổng hợp 4 hài hòa sóng nước tự nhiên
        const dx =
          Math.cos(u) * 0.40 +
          Math.cos(u * 2.3 + v * 0.8) * 0.28 +
          Math.cos(u * 4.1 - v * 1.9) * 0.16 +
          Math.cos(u * 7.5 + v * 3.4) * 0.08;

        const dy =
          -Math.sin(v) * 0.40 +
          Math.cos(u * 0.9 + v * 2.4) * 0.28 -
          Math.sin(u * 1.8 - v * 4.2) * 0.16 +
          Math.sin(u * 3.2 + v * 7.6) * 0.08;

        let nx = -dx * 0.85;
        let ny = -dy * 0.85;
        let nz = 1.0;

        const len = Math.hypot(nx, ny, nz);
        nx /= len;
        ny /= len;
        nz /= len;

        const idx = (y * width + x) * 4;
        data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Sinh Texture hoa văn gợn nước khúc xạ đáy hồ (Voronoi-inspired Caustics Pattern)
   */
  private generateCausticsTexture(width: number, height: number): THREE.DataTexture {
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = (x / width) * Math.PI * 6;
        const v = (y / height) * Math.PI * 6;

        const c1 = Math.abs(Math.sin(u + Math.cos(v * 1.4)));
        const c2 = Math.abs(Math.sin(v + Math.cos(u * 1.4)));
        const c3 = Math.abs(Math.sin((u + v) * 0.8 + Math.cos(u - v)));

        const c = Math.pow(1.0 - (c1 * 0.45 + c2 * 0.45 + c3 * 0.10), 2.8);
        const val = Math.floor(Math.min(255, c * 340));

        const idx = (y * width + x) * 4;
        data[idx] = Math.floor(val * 0.85);       // R
        data[idx + 1] = val;                     // G
        data[idx + 2] = Math.floor(val * 0.95);  // B
        data[idx + 3] = Math.floor(c * 210);     // Alpha
      }
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Điều chỉnh tông màu & ánh sáng phản chiếu mặt nước theo thời gian trong ngày
   */
  public setTimeOfDay(mode: WaterTimeMode) {
    const uniforms = this.material.uniforms;

    if (mode === "dawn") {
      uniforms.uDeepColor.value.setHex(0x062420);
      uniforms.uShallowColor.value.setHex(0x115e54);
      uniforms.uFresnelColor.value.setHex(0xffc5af); // Rạng đông hồng cam
      uniforms.uSunDirection.value.set(0.8, 0.4, 0.4).normalize();
      uniforms.uSunColor.value.setHex(0xffe2c4);
      uniforms.uLanternGlow.value.setHex(0xff8833);
      this.causticsMat.opacity = 0.28;
    } else if (mode === "sunset") {
      uniforms.uDeepColor.value.setHex(0x121a1c);
      uniforms.uShallowColor.value.setHex(0x562a1c);
      uniforms.uFresnelColor.value.setHex(0xff6e38); // Ráng chiều đỏ cam
      uniforms.uSunDirection.value.set(-0.7, 0.3, 0.3).normalize();
      uniforms.uSunColor.value.setHex(0xff5522);
      uniforms.uLanternGlow.value.setHex(0xffaa33);
      this.causticsMat.opacity = 0.22;
    } else if (mode === "night") {
      uniforms.uDeepColor.value.setHex(0x020d12); // Chàm đêm huyền bí
      uniforms.uShallowColor.value.setHex(0x051820);
      uniforms.uFresnelColor.value.setHex(0x1e3650); // Ánh trăng xanh lam
      uniforms.uSunDirection.value.set(-0.2, 0.9, -0.3).normalize();
      uniforms.uSunColor.value.setHex(0xaaccff);
      uniforms.uLanternGlow.value.setHex(0xffbb33); // Nổi bật ánh hoa đăng
      this.causticsMat.opacity = 0.16;
    } else {
      // Ban ngày (day) - Màu ngọc bích sâu thẳm lấp lánh ánh kim
      uniforms.uDeepColor.value.setHex(0x021614);
      uniforms.uShallowColor.value.setHex(0x0a4a40);
      uniforms.uFresnelColor.value.setHex(0x56a6ba);
      uniforms.uSunDirection.value.set(0.45, 0.85, 0.45).normalize();
      uniforms.uSunColor.value.setHex(0xfffaee);
      uniforms.uLanternGlow.value.setHex(0xffaa44);
      this.causticsMat.opacity = 0.38;
    }
  }

  /**
   * Cập nhật gợn sóng nước & khúc xạ ánh sáng mỗi frame
   * Tối ưu hiệu năng 60 FPS mượt mà
   */
  public update(time: number) {
    this.material.uniforms.uTime.value = time;

    // Cuộn trôi hoa văn khúc xạ đáy hồ nhẹ nhàng
    if (this.causticsTexture) {
      this.causticsTexture.offset.x = (time * 0.012) % 1.0;
      this.causticsTexture.offset.y = (time * 0.008) % 1.0;
    }
  }
}
