// Utility to load Lottie animation data from the manifest
import manifest from '../../assets/animations/manifest.json';

// Type for the animation manifest
type AnimationManifest = Record<string, string>;

// Type for the loaded animation data (assuming it's a JSON object)
type AnimationData = any;

/**
 * Loads animation data for a given animation name.
 * @param name - The name of the animation as defined in the manifest.
 * @returns A promise that resolves to the animation data.
 * @throws Error if the animation name is not found in the manifest.
 */
export async function loadAnimation(name: string): Promise<AnimationData> {
  // Check if the animation name exists in the manifest
  if (!(name in manifest)) {
    throw new Error(`Animation "${name}" not found in manifest. Available animations: ${Object.keys(manifest).join(', ')}`);
  }

  // Get the path from the manifest
  const path = manifest[name as keyof typeof manifest];

  try {
    // Dynamically import the JSON file
    const animationModule = await import(path);
    return animationModule.default || animationModule;
  } catch (error) {
    throw new Error(`Failed to load animation "${name}" from path "${path}": ${error}`);
  }
}

// Export the manifest for potential external use
export { manifest };