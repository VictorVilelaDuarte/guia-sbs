"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Categoria, CategoriaPonto } from "@prisma/client";
import type { ComercioMapa, PontoMapa, SelectedItem } from "../_types";
import { SheetLocal } from "./sheet-local";
import { BottomNav } from "@/components/public/home/bottom-nav";
import { Search, MapPin, X, Layers } from "lucide-react";

type TipoFiltro = "todos" | "comercios" | "pontos";

// ─── Constantes de cor ───────────────────────────────────────────────────────

const CATEGORIA_COR: Record<Categoria, string> = {
  ALIMENTACAO: "#F97316",
  HOSPEDAGEM: "#3B82F6",
  TURISMO: "#22C55E",
  SERVICO: "#A855F7",
  COMERCIO: "#F43F5E",
  ENTRETENIMENTO: "#EAB308",
};

const CATEGORIA_LABEL: Record<Categoria, string> = {
  ALIMENTACAO: "Alimentação",
  HOSPEDAGEM: "Hospedagem",
  TURISMO: "Turismo",
  SERVICO: "Serviço",
  COMERCIO: "Comércio",
  ENTRETENIMENTO: "Entretenimento",
};

const PT_COR: Record<CategoriaPonto, string> = {
  MIRANTE: "#0EA5E9",
  TRILHA: "#16A34A",
  HISTORICO: "#D97706",
  CACHOEIRA: "#06B6D4",
};

// ─── Estilo personalizado do mapa (tons quentes/terrosos) ────────────────────

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5ede0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#3d2b1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fdf5e9" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c9ab8c" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#d8e8c0" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#ede5d4" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#c5dba8", visibility: "on" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a5c3a" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#f4e4c0" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#edd090" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d4a840" }],
  },
  {
    featureType: "road.local",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#a8cfe0" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5c8fa8" }],
  },
];

const SBS_CENTER = { lat: -22.6989, lng: -45.7281 };

// ─── Helpers de ícone ────────────────────────────────────────────────────────

type MarkerEntry = {
  marker: google.maps.Marker;
  tipo: "comercio" | "ponto";
  comercio?: ComercioMapa;
  ponto?: PontoMapa;
};

function circleIcon(color: string, size = 28): google.maps.Icon {
  const r = size / 2 - 2.5;
  const c = size / 2;
  const svg = encodeURIComponent(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${c}" cy="${c}" r="${r}" fill="${color}" stroke="white" stroke-width="2.5"/>` +
      `</svg>`,
  );
  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(c, c),
  };
}

function pinIcon(color: string): google.maps.Icon {
  const svg = encodeURIComponent(
    `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">` +
      `<path d="M11 0C4.92 0 0 4.92 0 11c0 8.25 11 19 11 19S22 19.25 22 11C22 4.92 17.08 0 11 0z" fill="${color}" stroke="white" stroke-width="1.5"/>` +
      `<circle cx="11" cy="11" r="4.5" fill="white" fill-opacity="0.75"/>` +
      `</svg>`,
  );
  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new google.maps.Size(22, 30),
    anchor: new google.maps.Point(11, 30),
  };
}

async function buildLogoIcon(
  logoUrl: string,
  borderColor: string,
  size = 44,
): Promise<google.maps.Icon | null> {
  return new Promise((resolve) => {
    const dpr = window.devicePixelRatio || 1;
    const px = size * dpr;
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve(null);
    ctx.scale(dpr, dpr);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const half = size / 2;
        ctx.beginPath();
        ctx.arc(half, half, half - 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(half, half, half - 3, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 3, 3, size - 6, size - 6);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(half, half, half - 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        resolve({
          url: canvas.toDataURL("image/png"),
          scaledSize: new google.maps.Size(size, size),
          anchor: new google.maps.Point(half, half),
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

// ─── Distância Haversine ─────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// ─── Chip ────────────────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
  activeColor,
  border,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeColor?: string;
  border?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active
          ? (activeColor ?? "#2C2416")
          : "rgba(255,255,255,.92)",
        color: active ? "#fff" : "#2C2416",
        border: active ? "none" : (border ?? "none"),
        borderRadius: 999,
        padding: "7px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 10px rgba(0,0,0,.15)",
        backdropFilter: "blur(12px)",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function MapaClient({
  comercios,
  pontos,
}: {
  comercios: ComercioMapa[];
  pontos: PontoMapa[];
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<Categoria | null>(
    null,
  );
  const [apertosApenas, setApertosApenas] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoFilterActive, setGeoFilterActive] = useState(false);
  const [raioKm] = useState(5);
  const [visibleCount, setVisibleCount] = useState(
    comercios.length + pontos.length,
  );
  const [mapReady, setMapReady] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SelectedItem[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [satelliteMode, setSatelliteMode] = useState(false);

  // ── Inicialização do mapa ──────────────────────────────────────────────────
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiKeyMissing(true);
      return;
    }
    if (!mapDivRef.current) return;

    let cancelled = false;

    // Import dinâmico: o @googlemaps/js-api-loader v2 acessa `window` na
    // avaliação do módulo (window.trustedTypes), o que quebra o prerender SSR.
    // Carregá-lo aqui dentro garante que só seja avaliado no cliente.
    import("@googlemaps/js-api-loader")
      .then(({ setOptions, importLibrary }) => {
        setOptions({ key: apiKey, v: "weekly" });
        return importLibrary("maps");
      })
      .then(() => {
      if (cancelled || !mapDivRef.current) return;

      const map = new google.maps.Map(mapDivRef.current, {
        center: SBS_CENTER,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "greedy",
        styles: MAP_STYLE,
      });

      mapRef.current = map;
      const entries: MarkerEntry[] = [];

      for (const c of comercios) {
        const color = CATEGORIA_COR[c.categorias[0]] ?? "#888888";
        const marker = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng },
          icon: circleIcon(color, 28),
          title: c.nome,
          optimized: false,
        });
        marker.addListener("click", () => {
          setSelected({ tipo: "comercio", data: c });
          map.panTo({ lat: c.lat, lng: c.lng });
          if (map.getZoom()! < 16) map.setZoom(16);
        });
        entries.push({ marker, tipo: "comercio", comercio: c });

        if (c.logo) {
          buildLogoIcon(c.logo, color).then((icon) => {
            if (!cancelled && icon) marker.setIcon(icon);
          });
        }
      }

      for (const p of pontos) {
        const color = PT_COR[p.categoria] ?? "#888888";
        const marker = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          icon: pinIcon(color),
          title: p.nome,
          optimized: false,
        });
        marker.addListener("click", () => {
          setSelected({ tipo: "ponto", data: p });
          map.panTo({ lat: p.lat, lng: p.lng });
          if (map.getZoom()! < 16) map.setZoom(16);
        });
        entries.push({ marker, tipo: "ponto", ponto: p });
      }

      markersRef.current = entries;

      const clusterer = new MarkerClusterer({
        map,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        markers: entries.map((e) => e.marker) as any,
        renderer: {
          render({ count, position }) {
            const scale = count > 20 ? 24 : count > 10 ? 20 : 16;
            return new google.maps.Marker({
              position,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: "#2C2416",
                fillOpacity: 1,
                strokeColor: "rgba(245,240,232,0.85)",
                strokeWeight: 2.5,
                scale,
              },
              label: {
                text: String(count),
                color: "#F5F0E8",
                fontSize: "11px",
                fontWeight: "700",
              },
              zIndex: 1000 + count,
            });
          },
        },
      });

      clustererRef.current = clusterer;

      // Animação de entrada escalonada
      setTimeout(() => {
        entries.forEach((entry, i) => {
          setTimeout(
            () => {
              if (!cancelled)
                entry.marker.setAnimation(google.maps.Animation.DROP);
            },
            Math.min(i * 40, 700),
          );
        });
      }, 150);

      setMapReady(true);
    });

    // Obtém localização silenciosamente para exibir distância no sheet
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled)
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
        },
        () => {}, // permissão negada — sem ação
        { enableHighAccuracy: false, timeout: 8000 },
      );
    }

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aplicar filtros ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !clustererRef.current) return;

    const visible = markersRef.current.filter(({ tipo, comercio, ponto }) => {
      if (tipoFiltro === "pontos" && tipo === "comercio") return false;
      if (tipoFiltro === "comercios" && tipo === "ponto") return false;

      const item = tipo === "comercio" ? comercio : ponto;
      if (!item) return false;

      if (userLocation && geoFilterActive) {
        const dist = haversineKm(
          userLocation.lat,
          userLocation.lng,
          item.lat,
          item.lng,
        );
        if (dist > raioKm) return false;
      }

      if (tipo === "comercio" && comercio) {
        if (categoriaFiltro && !comercio.categorias.includes(categoriaFiltro))
          return false;
        if (apertosApenas && !comercio.aberto) return false;
      }

      return true;
    });

    clustererRef.current.clearMarkers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clustererRef.current.addMarkers(visible.map((e) => e.marker) as any);
    setVisibleCount(visible.length);
  }, [
    mapReady,
    tipoFiltro,
    categoriaFiltro,
    apertosApenas,
    userLocation,
    geoFilterActive,
    raioKm,
  ]);

  // ── Círculo de raio no mapa ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    if (userLocation && geoFilterActive) {
      circleRef.current = new google.maps.Circle({
        map: mapRef.current,
        center: userLocation,
        radius: raioKm * 1000,
        fillColor: "#4285F4",
        fillOpacity: 0.07,
        strokeColor: "#4285F4",
        strokeOpacity: 0.35,
        strokeWeight: 1.5,
      });
    }
  }, [mapReady, userLocation, geoFilterActive, raioKm]);

  // ── Geolocalização ────────────────────────────────────────────────────────
  function applyGeoLocation(loc: { lat: number; lng: number }) {
    setUserLocation(loc);
    setGeoFilterActive(true);

    if (mapRef.current) {
      mapRef.current.setCenter(loc);
      mapRef.current.setZoom(15);
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(loc);
    } else if (mapRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: loc,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          scale: 10,
        },
        title: "Você está aqui",
        zIndex: 2000,
      });
    }
  }

  function handlePertoDeMim() {
    // Se já temos a localização (obtida silenciosamente no load), apenas ativa o filtro
    if (userLocation) {
      applyGeoLocation(userLocation);
      return;
    }
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        applyGeoLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // ── Busca ─────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (!q.trim()) {
        setSearchResults([]);
        return;
      }
      const lq = q.toLowerCase();
      const results: SelectedItem[] = [
        ...comercios
          .filter((c) => c.nome.toLowerCase().includes(lq))
          .slice(0, 4)
          .map((c) => ({ tipo: "comercio" as const, data: c })),
        ...pontos
          .filter((p) => p.nome.toLowerCase().includes(lq))
          .slice(0, 2)
          .map((p) => ({ tipo: "ponto" as const, data: p })),
      ];
      setSearchResults(results);
    },
    [comercios, pontos],
  );

  function handleSelectResult(item: SelectedItem) {
    const { lat, lng } = item.data;
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(17);
    setSelected(item);
    setSearchQuery("");
    setSearchResults([]);
  }

  function handleTipo(tipo: TipoFiltro) {
    setTipoFiltro(tipo);
    if (tipo === "pontos") {
      setCategoriaFiltro(null);
      setApertosApenas(false);
    }
  }

  const showComercioFilters =
    tipoFiltro === "todos" || tipoFiltro === "comercios";

  if (apiKeyMissing) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          background: "var(--sand-1)",
        }}
      >
        <p
          style={{ fontWeight: 600, color: "var(--ink)", textAlign: "center" }}
        >
          Configure a chave da API do Google Maps
        </p>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          Adicione <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> no arquivo{" "}
          <code>.env</code>
        </p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      {/* Mapa */}
      <div ref={mapDivRef} style={{ position: "absolute", inset: 0 }} />

      {/* Filtros flutuantes */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: "0 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {/* Busca */}
        <div style={{ position: "relative", pointerEvents: "auto" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(44,36,22,.45)",
                  pointerEvents: "none",
                }}
              />
              <input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar comércio ou ponto..."
                style={{
                  width: "100%",
                  padding: "10px 36px 10px 34px",
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(255,255,255,.95)",
                  boxShadow: "0 2px 10px rgba(0,0,0,.15)",
                  backdropFilter: "blur(12px)",
                  fontSize: 16,
                  fontFamily: "inherit",
                  color: "#2C2416",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 2,
                  }}
                >
                  <X size={14} color="rgba(44,36,22,.4)" />
                </button>
              )}
            </div>

            {/* Botão perto de mim */}
            <button
              onClick={
                geoFilterActive
                  ? () => setGeoFilterActive(false)
                  : handlePertoDeMim
              }
              disabled={geoLoading}
              title={geoFilterActive ? "Desativar filtro por localização" : "Perto de mim"}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: geoFilterActive ? "none" : "none",
                background: geoFilterActive
                  ? "#4285F4"
                  : "rgba(255,255,255,.95)",
                boxShadow: "0 2px 10px rgba(0,0,0,.15)",
                backdropFilter: "blur(12px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: geoLoading ? "wait" : "pointer",
                flexShrink: 0,
                transition: "background .2s",
              }}
            >
              <MapPin size={17} color={geoFilterActive ? "#fff" : "#4285F4"} />
            </button>
          </div>

          {/* Dropdown de resultados */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 48,
                background: "rgba(255,255,255,.98)",
                borderRadius: 14,
                boxShadow: "0 4px 20px rgba(0,0,0,.15)",
                overflow: "hidden",
                zIndex: 20,
              }}
            >
              {searchResults.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(item)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderTop: i > 0 ? "1px solid rgba(44,36,22,.06)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        item.tipo === "comercio"
                          ? (CATEGORIA_COR[
                              item.data.categorias?.[0] as Categoria
                            ] ?? "#888")
                          : (PT_COR[item.data.categoria as CategoriaPonto] ??
                            "#888"),
                    }}
                  />
                  <span
                    style={{ fontSize: 13, color: "#2C2416", fontWeight: 500 }}
                  >
                    {item.data.nome}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(44,36,22,.45)",
                      marginLeft: "auto",
                    }}
                  >
                    {item.tipo === "comercio" ? "Comércio" : "Ponto Turístico"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tipo */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            scrollbarWidth: "none",
            pointerEvents: "auto",
          }}
        >
          {(["todos", "comercios", "pontos"] as TipoFiltro[]).map((tipo) => {
            const LABELS: Record<TipoFiltro, string> = {
              todos: "Tudo",
              comercios: "Comércios",
              pontos: "Pontos Turísticos",
            };
            return (
              <Chip
                key={tipo}
                active={tipoFiltro === tipo}
                onClick={() => handleTipo(tipo)}
              >
                {LABELS[tipo]}
              </Chip>
            );
          })}
        </div>

        {/* Categoria + Abertos */}
        {showComercioFilters && (
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              scrollbarWidth: "none",
              pointerEvents: "auto",
            }}
          >
            <Chip
              active={apertosApenas}
              activeColor="#22C55E"
              onClick={() => setApertosApenas((v) => !v)}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: apertosApenas
                    ? "rgba(255,255,255,.8)"
                    : "#22C55E",
                  flexShrink: 0,
                }}
              />
              Abertos agora
            </Chip>
            {(Object.entries(CATEGORIA_LABEL) as [Categoria, string][]).map(
              ([cat, label]) => (
                <Chip
                  key={cat}
                  active={categoriaFiltro === cat}
                  activeColor={CATEGORIA_COR[cat]}
                  border={`1.5px solid ${CATEGORIA_COR[cat]}`}
                  onClick={() =>
                    setCategoriaFiltro(categoriaFiltro === cat ? null : cat)
                  }
                >
                  {label}
                </Chip>
              ),
            )}
          </div>
        )}
      </div>

      {/* Contador de locais */}
      {mapReady && (
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            background: "rgba(44,36,22,.82)",
            color: "#F5F0E8",
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            backdropFilter: "blur(8px)",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,.2)",
            pointerEvents: "none",
          }}
        >
          {visibleCount}{" "}
          {visibleCount === 1 ? "local encontrado" : "locais encontrados"}
        </div>
      )}

      {/* Botão satélite */}
      {mapReady && (
        <button
          onClick={() => {
            const next = !satelliteMode;
            setSatelliteMode(next);
            mapRef.current?.setMapTypeId(next ? "satellite" : "roadmap");
          }}
          title={satelliteMode ? "Ver mapa" : "Ver satélite"}
          style={{
            position: "absolute",
            bottom: 108,
            right: 16,
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: satelliteMode ? "#2C2416" : "rgba(255,255,255,.95)",
            boxShadow: "0 2px 10px rgba(0,0,0,.18)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background .2s",
          }}
        >
          <Layers size={17} color={satelliteMode ? "#F5F0E8" : "#2C2416"} />
        </button>
      )}

      {/* Bottom sheet */}
      {selected && (
        <SheetLocal
          item={selected}
          onClose={() => setSelected(null)}
          userLocation={userLocation}
        />
      )}

      {/* BottomNav flutuante */}
      <BottomNav />
    </div>
  );
}
