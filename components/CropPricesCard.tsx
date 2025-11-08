import React from 'react';
import { CropPricesData } from '../types';
import PriceTagIcon from './icons/PriceTagIcon';

const CropPricesCard: React.FC<{ data: CropPricesData }> = ({ data }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white w-full max-w-md shadow-lg border border-green-500/20">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-green-400">{data.district} Market</h2>
          <p className="text-2xl font-bold">{data.crop}</p>
        </div>
        <div className="text-green-300">
          <PriceTagIcon />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">Today's Prices</h3>
        <ul className="space-y-2">
          {data.prices.map((item, index) => (
            <li key={index} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-md">
              <div>
                <p className="font-semibold text-gray-200">{item.marketName}</p>
                <p className="text-xs text-gray-400">Grade: {item.grade}</p>
              </div>
              <p className="text-lg font-bold text-green-400">{item.price}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CropPricesCard;
