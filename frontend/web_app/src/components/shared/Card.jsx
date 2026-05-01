import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 'p-6',
  shadow = 'shadow-sm',
  ...props 
}) => {
  const cardClasses = `
    bg-white rounded-lg border border-gray-200
    ${shadow}
    ${padding}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;
