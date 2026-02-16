import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 1:1 from web/icons.js ShareIconPhosphor (regular + fill selected state)
const REGULAR_PATH =
  'M216,112v96a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V112A16,16,0,0,1,56,96H80a8,8,0,0,1,0,16H56v96H200V112H176a8,8,0,0,1,0-16h24A16,16,0,0,1,216,112ZM93.66,69.66,120,43.31V136a8,8,0,0,0,16,0V43.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,69.66Z';
const FILL_PATH =
  'M216,112v96a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V112A16,16,0,0,1,56,96h64v48a8,8,0,0,0,16,0V96h64A16,16,0,0,1,216,112ZM136,43.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,69.66L120,43.31V96h16Z';

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
