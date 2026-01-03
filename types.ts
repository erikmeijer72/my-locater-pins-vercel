
export interface PinData {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  countryCode: string;
  date: string;
  time: string;
  mapImageUrl: string;
}

export interface GeocodingResult {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    country_code?: string;
  };
}
