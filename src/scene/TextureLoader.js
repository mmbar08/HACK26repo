import * as THREE from 'three';

export class TextureAssetLoader {
  constructor() {
    this.loader = new THREE.TextureLoader();
  }

  async loadTexture(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }

  configureTexture(texture, options = {}) {
    if (!texture) {
      return texture;
    }

    texture.wrapS = options.wrapS ?? THREE.RepeatWrapping;
    texture.wrapT = options.wrapT ?? THREE.RepeatWrapping;

    const repeatX = options.repeatX ?? 1;
    const repeatY = options.repeatY ?? 1;
    texture.repeat.set(repeatX, repeatY);

    if (options.colorSpace) {
      texture.colorSpace = options.colorSpace;
    }

    return texture;
  }

  async loadPbrSet(config) {
    const albedoUrl = config.albedoUrl;
    const normalUrl = config.normalUrl;
    const armUrl = config.armUrl;

    const [albedo, normal, arm] = await Promise.all([
      this.loadTexture(albedoUrl),
      this.loadTexture(normalUrl),
      this.loadTexture(armUrl),
    ]);

    const repeatX = config.repeatX ?? 1;
    const repeatY = config.repeatY ?? repeatX;

    this.configureTexture(albedo, {
      repeatX,
      repeatY,
      colorSpace: THREE.SRGBColorSpace,
    });

    this.configureTexture(normal, {
      repeatX,
      repeatY,
      colorSpace: THREE.NoColorSpace,
    });

    this.configureTexture(arm, {
      repeatX,
      repeatY,
      colorSpace: THREE.NoColorSpace,
    });

    return { albedo, normal, arm };
  }
}
