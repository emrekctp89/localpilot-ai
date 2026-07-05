import RouteStatus from "./components/RouteStatus";

export default function Loading() {
  return (
    <RouteStatus
      title="Sayfa hazırlanıyor"
      description="İçerikler yüklenirken birkaç saniye bekleyin."
    />
  );
}
