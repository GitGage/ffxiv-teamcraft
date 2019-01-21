import { Injectable } from '@angular/core';
import { mapIds } from '../data/sources/map-ids';
import { weatherIndex } from '../data/sources/weather-index';

@Injectable()
export class WeatherService {


  /**
   * Gets weather rate for a given time,
   * see https://github.com/viion/ffxiv-datamining/blob/master/docs/Weather.md for implementation details
   * @param weatherRate
   * @param date
   */
  private getWeatherRateValue(weatherRate: number, date: Date): number {
    const unixSeconds = Math.trunc(date.getTime() / 1000);
    const eorzeanHour = unixSeconds / 175;
    // Do the magic 'cause for calculations 16:00 is 0, 00:00 is 8 and 08:00 is 16
    const increment = (eorzeanHour + 8 - (eorzeanHour % 8)) % 24;
    // Take Eorzea days since unix epoch
    let totalDays = unixSeconds / 4200;
    totalDays = (totalDays << 32) >>> 0; // Convert to uint
    // 0x64 = 100
    const calcBase = totalDays * 100 + increment;
    // 0xB = 11
    const step1 = (calcBase << 11) ^ calcBase;
    const step2 = (step1 >>> 8) ^ step1;
    // 0x64 = 100
    return step2 % 100;
  }

  public getWeather(mapId: number, date: Date): number {
    const weatherRate = mapIds.find(map => map.id === mapId).weatherRate;
    const weatherRateValue = this.getWeatherRateValue(weatherRate, date);
    const rates = Object.keys(weatherRate);
    for (const rate of rates) {
      if (weatherRateValue <= +rate) {
        return weatherRate[rate];
      }
    }
    return 1;
  }

  public getNextWeatherStart(mapId: number, weatherId: number): Date | null {
    const weatherRate = mapIds.find(map => map.id === mapId).weatherRate;
    return null;
  }
}
