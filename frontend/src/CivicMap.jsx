import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function MapResize() {
  const map = useMap();

  useEffect(() => {
    const resizeMap = () => {
      map.invalidateSize();
    };

    resizeMap();

    const timer = setTimeout(resizeMap, 300);

    window.addEventListener("resize", resizeMap);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resizeMap);
    };
  }, [map]);

  return null;
}

function MapFocus({ issue }) {
  const map = useMap();

  const lat = issue?.lat ?? issue?.coordinates?.lat;
  const lng = issue?.lng ?? issue?.coordinates?.lng;

  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([Number(lat), Number(lng)], 16, {
        duration: 0.8,
      });
    }
  }, [lat, lng, map]);

  return null;
}

function CivicMap({ issues = [], theme = "dark" }) {
  const [selectedIssue, setSelectedIssue] = useState(null);

  const defaultCenter = [24.648, 77.315];

  const demoIssues = [
    {
      id: "CIVIC-1042",
      title: "Broken Streetlight",
      category: "Streetlight",
      status: "In Progress",
      priority: "High",
      location: "Main Gate, Guna",
      lat: 24.645,
      lng: 77.316,
    },
    {
      id: "CIVIC-1037",
      title: "Garbage Overflow",
      category: "Garbage",
      status: "Verified",
      priority: "Medium",
      location: "Civil Lines, Guna",
      lat: 24.647,
      lng: 77.314,
    },
    {
      id: "CIVIC-1029",
      title: "Road Pothole",
      category: "Road",
      status: "Resolved",
      priority: "Critical",
      location: "AB Road, Guna",
      lat: 24.651,
      lng: 77.319,
    },
  ];

  const hasCoordinates = (issue) => {
    const lat = issue?.lat ?? issue?.coordinates?.lat;
    const lng = issue?.lng ?? issue?.coordinates?.lng;

    return (
      lat != null &&
      lng != null &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lng))
    );
  };

  const mapIssues =
    issues.length > 0
      ? issues.map((issue, index) => {
          if (hasCoordinates(issue)) {
            return issue;
          }

          return {
            ...issue,
            lat: demoIssues[index % demoIssues.length].lat,
            lng: demoIssues[index % demoIssues.length].lng,
          };
        })
      : demoIssues;

  const getIssueIcon = (category) => {
    if (category === "Garbage") return "🗑️";
    if (category === "Road") return "🛣️";
    if (category === "Streetlight") return "💡";
    if (category === "Water Supply") return "🚰";
    if (category === "Drainage") return "🌧️";
    if (category === "Electricity") return "⚡";

    return "⚠️";
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "")
      .toLowerCase()
      .trim();

    if (normalized === "in progress") {
      return "progress";
    }

    if (
      normalized === "resolved" ||
      normalized === "closed"
    ) {
      return "resolved";
    }

    return "reported";
  };

  return (
    <main className="civic-map-page">
      <div className="map-header">
        <div>
          <span className="section-label">
            CIVIC VISUALIZATION
          </span>

          <h1>Civic Issue Map</h1>

          <p>
            See reported civic problems across the community.
          </p>
        </div>

        <div className="map-count">
          <strong>{mapIssues.length}</strong>
          <span>Reported Issues</span>
        </div>
      </div>

      <div className="map-layout">
        <div className="google-map-container">
          <MapContainer
            center={defaultCenter}
            zoom={14}
            scrollWheelZoom={true}
            className="civic-leaflet-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={
                theme === "dark"
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              }
            />

            <MapResize />

            <MapFocus issue={selectedIssue} />

            {mapIssues.map((issue) => {
              const lat =
                issue.lat ??
                issue.coordinates?.lat;

              const lng =
                issue.lng ??
                issue.coordinates?.lng;

              return (
                <Marker
                  key={issue.id}
                  position={[
                    Number(lat),
                    Number(lng),
                  ]}
                  eventHandlers={{
                    click: () =>
                      setSelectedIssue(issue),
                  }}
                >
                  <Popup>
                    <div className="map-info-window">
                      <span>{issue.category}</span>

                      <h3>{issue.title}</h3>

                      <p>📍 {issue.location}</p>

                      <strong>{issue.status}</strong>

                      <small>ID: {issue.id}</small>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <aside className="map-sidebar">
          <div className="map-sidebar-header">
            <span className="small-text">
              LIVE ISSUES
            </span>

            <h2>Reported Problems</h2>
          </div>

          <div className="map-issue-list">
            {mapIssues.map((issue) => (
              <button
                className={`map-issue ${
                  selectedIssue?.id === issue.id
                    ? "selected"
                    : ""
                }`}
                key={issue.id}
                onClick={() =>
                  setSelectedIssue(issue)
                }
              >
                <div className="map-issue-icon">
                  {getIssueIcon(issue.category)}
                </div>

                <div className="map-issue-content">
                  <strong>{issue.title}</strong>

                  <span>📍 {issue.location}</span>

                  <small
                    className={`map-status ${getStatusClass(
                      issue.status
                    )}`}
                  >
                    {issue.status || "Reported"}
                  </small>
                </div>

                <span className="map-arrow">→</span>
              </button>
            ))}
          </div>

          <div className="map-legend">
            <span className="small-text">
              STATUS
            </span>

            <div>
              <span className="legend-dot reported" />
              Reported
            </div>

            <div>
              <span className="legend-dot progress" />
              In Progress
            </div>

            <div>
              <span className="legend-dot resolved" />
              Resolved
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default CivicMap;