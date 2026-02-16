import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 1:1 from native App.js HomeIcon (Phosphor house - used in header)
export default ({ size = 24, color = '#000', ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color} {...props}>
    <Path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8H96a8,8,0,0,0,8-8V160h48v56a8,8,0,0,0,8,8h56a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H168V152a8,8,0,0,0-8-8H96a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z" />
  </Svg>
);
