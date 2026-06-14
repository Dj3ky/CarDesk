import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CarDesk",
    short_name: "CarDesk",
    description: "Automotive Dealership Management System",
    theme_color: "#3b82f6",
    background_color: "#0f172a",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/",
    icons: [
      { src: "/icons/icon-72x72.png?v=2",   sizes: "72x72",   type: "image/png", purpose: "any" },
      { src: "/icons/icon-72x72.png?v=2",   sizes: "72x72",   type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-96x96.png?v=2",   sizes: "96x96",   type: "image/png", purpose: "any" },
      { src: "/icons/icon-96x96.png?v=2",   sizes: "96x96",   type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-128x128.png?v=2", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128x128.png?v=2", sizes: "128x128", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-144x144.png?v=2", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144x144.png?v=2", sizes: "144x144", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-152x152.png?v=2", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152x152.png?v=2", sizes: "152x152", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-192x192.png?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png?v=2", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-384x384.png?v=2", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384x384.png?v=2", sizes: "384x384", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512x512.png?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
