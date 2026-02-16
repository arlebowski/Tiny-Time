import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 1:1 from web/icons.js KidSelectorOnIcon
export default ({ size = 24, color = '#000', ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color} {...props}>
    <Path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208Z" />
    <Path d="M180,92.69a8,8,0,0,0-11.31,0L112,149.37,87.31,124.69a8,8,0,1,0-11.31,11.31l30.34,30.34a8,8,0,0,0,11.31,0l62.34-62.34A8,8,0,0,0,180,92.69Z" />
  </Svg>
);
