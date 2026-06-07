export function reverseGeocodeLatLngDetailed(kakao, lat, lng) {
  return new Promise((resolve) => {
    const y = Number(lat);
    const x = Number(lng);
    if (!kakao?.maps?.services?.Geocoder || !Number.isFinite(y) || !Number.isFinite(x)) {
      resolve({ roadAddress: "", jibunAddress: "", address: "" });
      return;
    }

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(x, y, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || !Array.isArray(result) || !result[0]) {
        resolve({ roadAddress: "", jibunAddress: "", address: "" });
        return;
      }
      const roadAddress = result[0]?.road_address?.address_name || "";
      const jibunAddress = result[0]?.address?.address_name || "";
      resolve({
        roadAddress,
        jibunAddress,
        address: roadAddress || jibunAddress || "",
      });
    });
  });
}

export function reverseGeocodeLatLng(kakao, lat, lng) {
  return new Promise((resolve) => {
    const y = Number(lat);
    const x = Number(lng);
    if (!kakao?.maps?.services?.Geocoder || !Number.isFinite(y) || !Number.isFinite(x)) {
      resolve("");
      return;
    }

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(x, y, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || !Array.isArray(result) || !result[0]) {
        resolve("");
        return;
      }
      const road = result[0]?.road_address?.address_name;
      const jibun = result[0]?.address?.address_name;
      resolve(road || jibun || "");
    });
  });
}

export async function createLifeInfoDraftFromLatLng({ kakao, lat, lng, type, title = "" } = {}) {
  const addressInfo = await reverseGeocodeLatLngDetailed(kakao, lat, lng);
  return {
    type,
    title,
    lat: Number(lat),
    lng: Number(lng),
    address: addressInfo.address,
    roadAddress: addressInfo.roadAddress,
    jibunAddress: addressInfo.jibunAddress,
  };
}
