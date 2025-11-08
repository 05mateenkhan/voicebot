import React from 'react';
import { WeatherData } from '../types';
import SunIcon from './icons/SunIcon';
import RainIcon from './icons/RainIcon';
import CloudyIcon from './icons/CloudyIcon';
import MapPinIcon from './icons/MapPinIcon';

interface WeatherCardProps {
  data: WeatherData;
}

const WeatherIcon: React.FC<{ condition: WeatherData['condition'], className?: string }> = ({ condition, className = 'h-12 w-12' }) => {
  switch (condition) {
    case 'sunny':
      return <SunIcon />;
    case 'rainy':
      return <RainIcon />;
    case 'cloudy':
      return <CloudyIcon />;
    default:
      return null;
  }
};

const WeatherCard: React.FC<WeatherCardProps> = ({ data }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white w-full max-w-md shadow-lg border border-green-500/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center text-lg font-semibold text-green-400">
            <MapPinIcon/>
            <h2>{data.location}</h2>
          </div>
          <p className="text-4xl font-bold">{data.temperature}</p>
        </div>
        <div className="text-green-300">
            <WeatherIcon condition={data.condition} className="h-16 w-16" />
        </div>
      </div>
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">Forecast</h3>
        <div className="flex justify-between text-center">
          {data.forecast.map((day, index) => (
            <div key={index} className="flex-1">
              <p className="text-sm font-medium text-gray-300">{day.day}</p>
              <div className="my-2 text-green-400 mx-auto w-8 h-8 flex items-center justify-center">
                <WeatherIcon condition={day.condition} className="h-6 w-6" />
              </div>
              <p className="text-md font-semibold">{day.temperature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;
