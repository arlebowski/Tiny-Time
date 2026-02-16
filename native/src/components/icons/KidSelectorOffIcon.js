import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 1:1 from web/icons.js KidSelectorOffIcon
export default ({ size = 24, color = '#000', ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color} {...props}>
    <Path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208Z" />
  </Svg>
);
