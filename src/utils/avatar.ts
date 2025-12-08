import { homedir } from "os";
import { resolve, normalize, sep } from "path";

/**
 * Returns the platform-specific allowed base directories for avatar files.
 * Supports macOS, Windows, and Linux.
 */
function getAllowedAvatarBases(): string[] {
  const home = homedir();
  const platform = process.platform;

  switch (platform) {
    case "darwin":
      // macOS: ~/Library/Application Support/BeeperTexts/media
      return [normalize(resolve(home, "Library/Application Support/BeeperTexts/media"))];

    case "win32":
      // Windows: %APPDATA%/BeeperTexts/media (typically ~/AppData/Roaming/BeeperTexts/media)
      return [normalize(resolve(home, "AppData", "Roaming", "BeeperTexts", "media"))];

    case "linux":
    default: {
      // Linux: $XDG_DATA_HOME/BeeperTexts/media or ~/.local/share/BeeperTexts/media
      const bases: string[] = [];
      const xdgDataHome = process.env.XDG_DATA_HOME;
      if (xdgDataHome) {
        bases.push(normalize(resolve(xdgDataHome, "BeeperTexts", "media")));
      }
      // Always include the fallback path
      bases.push(normalize(resolve(home, ".local", "share", "BeeperTexts", "media")));
      return bases;
    }
  }
}

// Allowed base directories for avatar files (platform-specific)
const ALLOWED_AVATAR_BASES = getAllowedAvatarBases();

/**
 * Checks if a normalized path is within any of the allowed avatar directories.
 * Prevents prefix attacks by requiring exact match or path separator after base.
 */
function isPathAllowed(normalizedPath: string): boolean {
  return ALLOWED_AVATAR_BASES.some((base) => {
    const isExactMatch = normalizedPath === base;
    const isSubpath = normalizedPath.startsWith(base + sep);
    return isExactMatch || isSubpath;
  });
}

/**
 * Safely converts a file:// URL to a validated filesystem path.
 * Returns undefined if the URL is invalid or points outside the allowed directory.
 *
 * Security measures:
 * - Only accepts file:// URLs, rejects all other schemes
 * - Wraps decodeURIComponent in try/catch for malformed URIs
 * - Normalizes and resolves path to prevent path traversal
 * - Validates path is exactly the allowed directory or a true subpath (prevents prefix attacks)
 * - Rejects paths with null bytes
 */
export function safeAvatarPath(url: string): string | undefined {
  try {
    // Only accept file:// URLs - explicitly reject other schemes
    if (!url.startsWith("file://")) {
      return undefined;
    }

    // Strip the file:// prefix
    let avatarPath = url.slice(7); // "file://".length === 7

    // Decode URL encoding safely
    try {
      avatarPath = decodeURIComponent(avatarPath);
    } catch {
      // URIError: malformed URI - return undefined to fall back to network icon
      return undefined;
    }

    // Reject paths with null bytes (could bypass string checks)
    if (avatarPath.includes("\0")) {
      return undefined;
    }

    // Normalize and resolve the path to prevent path traversal
    const normalizedPath = normalize(resolve(avatarPath));

    // Validate that the path is within one of the allowed avatar directories
    if (!isPathAllowed(normalizedPath)) {
      return undefined;
    }

    return normalizedPath;
  } catch {
    // Any unexpected error - fall back to network icon
    return undefined;
  }
}
