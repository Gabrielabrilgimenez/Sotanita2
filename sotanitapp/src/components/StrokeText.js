import { View, Text } from 'react-native';

export default function StrokeText({ 
  children, 
  style, 
  strokeColor = 'black', 
  strokeWidth = 2,
  ...props 
}) {
  const offsets = [];
  
  // Crear múltiples capas de stroke en diferentes ángulos
  for (let angle = 0; angle < 360; angle += 30) {
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * strokeWidth;
    const y = Math.sin(rad) * strokeWidth;
    offsets.push({ x, y });
  }
  
  return (
    <View style={{ position: 'relative' }}>
      {/* Capas de stroke */}
      {offsets.map((offset, idx) => (
        <Text
          key={`stroke-${idx}`}
          style={[
            style,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              color: strokeColor,
            },
            {
              transform: [{ translateX: offset.x }, { translateY: offset.y }],
            },
          ]}
          {...props}
        >
          {children}
        </Text>
      ))}
      {/* Texto principal */}
      <Text
        style={[
          style,
          {
            position: 'relative',
            zIndex: 10,
          },
        ]}
        {...props}
      >
        {children}
      </Text>
    </View>
  );
}
