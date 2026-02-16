import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 1:1 from web TTAmountStepper minus SVG
export default ({ size = 24, color = '#000', ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color} {...props}>
    <Path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z" />
  </Svg>
);
