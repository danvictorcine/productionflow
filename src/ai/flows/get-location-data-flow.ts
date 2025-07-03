'use server';
/**
 * @fileOverview A Genkit flow to get coordinates and weather data for a location.
 *
 * - getLocationData - Fetches coordinates and weather forecast.
 * - LocationDataInput - The input type for the flow.
 * - LocationData - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fromUnixTime, isSameDay } from 'date-fns';

const LocationDataInputSchema = z.union([
  z.object({
    location: z.string().describe("The city name or address to geocode."),
    date: z.date().optional().describe("The target date for the weather forecast."),
  }),
  z.object({
    lat: z.number().describe("The latitude for the weather forecast."),
    lon: z.number().describe("The longitude for the weather forecast."),
    date: z.date().optional().describe("The target date for the weather forecast."),
  }),
]);

export type LocationDataInput = z.infer<typeof LocationDataInputSchema>;

const CoordinatesSchema = z.object({
  lat: z.number().describe("Latitude"),
  lon: z.number().describe("Longitude"),
});

const WeatherDataSchema = z.object({
  dt: z.number(),
  sunrise: z.number(),
  sunset: z.number(),
  temp: z.object({
    day: z.number(),
  }),
  weather: z.array(z.object({
    id: z.number(),
    main: z.string(),
    description: z.string(),
    icon: z.string(),
  })),
  pop: z.number().describe("Probability of precipitation"),
});
export type WeatherData = z.infer<typeof WeatherDataSchema>;

const LocationDataSchema = z.object({
  coordinates: CoordinatesSchema.optional(),
  weather: WeatherDataSchema.optional(),
});
export type LocationData = z.infer<typeof LocationDataSchema>;

const getLocationDataFlow = ai.defineFlow(
  {
    name: 'getLocationDataFlow',
    inputSchema: LocationDataInputSchema,
    outputSchema: LocationDataSchema,
  },
  async (input) => {
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.error("OpenWeather API key is not configured.");
      throw new Error("OpenWeather API key is missing.");
    }
    
    let lat: number | undefined;
    let lon: number | undefined;

    if ('location' in input) {
      // Geocode the location string to get coordinates
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(input.location)}&limit=1&appid=${apiKey}`;
      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) {
        throw new Error(`Failed to geocode location: ${geoResponse.statusText}`);
      }
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        console.warn(`No coordinates found for location: ${input.location}`);
        return {}; // Return empty if location not found
      }
      lat = geoData[0].lat;
      lon = geoData[0].lon;
    } else {
      lat = input.lat;
      lon = input.lon;
    }

    if (lat === undefined || lon === undefined) {
      return {};
    }

    // Fetch daily forecast for the next 8 days using the coordinates
    const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${apiKey}&units=metric&lang=pt_br`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error(`Failed to fetch weather data: ${weatherResponse.statusText}`);
    }
    const weatherData = await weatherResponse.json();

    // Find the forecast for the specific date requested
    const targetDate = input.date || new Date();
    const dailyForecast = weatherData.daily.find((day: any) => 
        isSameDay(fromUnixTime(day.dt), targetDate)
    );

    return {
      coordinates: { lat, lon },
      weather: dailyForecast,
    };
  }
);


export async function getLocationData(input: LocationDataInput): Promise<LocationData | null> {
    try {
        return await getLocationDataFlow(input);
    } catch (error) {
        console.error("Error in getLocationData flow:", error);
        return null;
    }
}