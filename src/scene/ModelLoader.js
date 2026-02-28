import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
  }

  async loadModel(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => reject(error)
      );
    });
  }

  async loadModels(urls) {
    const results = await Promise.allSettled(urls.map((url) => this.loadModel(url)));

    return results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'fulfilled')
      .map(({ result }) => result.value);
  }
}
