import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 1:1 from web/icons.js HomeIcon (regular + fill selected state)
const REGULAR_PATH =
  'M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z';

const FILL_PATH =
  'M230.93,220a8,8,0,0,1-6.93,4H32a8,8,0,0,1-6.92-12c15.23-26.33,38.7-45.21,66.09-54.16a72,72,0,1,1,73.66,0c27.39,8.95,50.86,27.83,66.09,54.16A8,8,0,0,1,230.93,220Z';

export default ({
  size = 24,
  color = '#000',
  weight = 'regular',
  isSelected = false,
  isTapped = false,
  selectedWeight,
  ...props
}) => {
  let finalWeight = weight;
  if ((isSelected || isTapped) && selectedWeight) finalWeight = selectedWeight;

  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color} {...props}>
      <Path d={finalWeight === 'fill' ? FILL_PATH : REGULAR_PATH} />
    </Svg>
  );
};
