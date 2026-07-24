export type VisitClient = {
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  deviceName: string | null;
  operatingSystem: string | null;
  browser: string | null;
};

const matchVersion = (userAgent: string, expression: RegExp) => {
  const version = userAgent.match(expression)?.[1];
  return version ? version.replaceAll("_", ".") : null;
};

export function parseVisitClient(userAgent: string): VisitClient {
  const isIPad = /iPad/i.test(userAgent);
  const isIPhone = /iPhone|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isMobileAndroid = isAndroid && /Mobile/i.test(userAgent);

  const deviceType = isIPad || (isAndroid && !isMobileAndroid)
    ? "tablet"
    : isIPhone || isMobileAndroid
      ? "mobile"
      : /Windows|Macintosh|Linux|CrOS/i.test(userAgent)
        ? "desktop"
        : "unknown";

  const deviceName = isIPad
    ? "iPad"
    : isIPhone
      ? "iPhone"
      : isAndroid
        ? "Android"
        : deviceType === "desktop"
          ? "Компьютер"
          : null;

  const operatingSystem = isIPad || isIPhone
    ? `iOS${matchVersion(userAgent, /OS ([\d_]+)/i) ? ` ${matchVersion(userAgent, /OS ([\d_]+)/i)}` : ""}`
    : isAndroid
      ? `Android${matchVersion(userAgent, /Android ([\d.]+)/i) ? ` ${matchVersion(userAgent, /Android ([\d.]+)/i)}` : ""}`
      : /Windows NT 10\.0/i.test(userAgent)
        ? "Windows"
        : /Mac OS X/i.test(userAgent)
          ? `macOS${matchVersion(userAgent, /Mac OS X ([\d_]+)/i) ? ` ${matchVersion(userAgent, /Mac OS X ([\d_]+)/i)}` : ""}`
          : /Linux/i.test(userAgent)
            ? "Linux"
            : null;

  const browser = /Edg(?:e|A|iOS)?\/([\d.]+)/i.test(userAgent)
    ? `Edge ${matchVersion(userAgent, /Edg(?:e|A|iOS)?\/([\d.]+)/i)}`
    : /(?:Chrome|CriOS)\/([\d.]+)/i.test(userAgent)
      ? `Chrome ${matchVersion(userAgent, /(?:Chrome|CriOS)\/([\d.]+)/i)}`
      : /(?:Firefox|FxiOS)\/([\d.]+)/i.test(userAgent)
        ? `Firefox ${matchVersion(userAgent, /(?:Firefox|FxiOS)\/([\d.]+)/i)}`
        : /Version\/([\d.]+).*Safari/i.test(userAgent)
          ? `Safari ${matchVersion(userAgent, /Version\/([\d.]+)/i)}`
          : null;

  return { deviceType, deviceName, operatingSystem, browser };
}
