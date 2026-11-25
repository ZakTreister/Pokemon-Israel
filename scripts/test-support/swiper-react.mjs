// React TestRenderer does not mount browser DOM nodes. Swiper's layout effects
// require real elements; isolate that external boundary in component-tree tests.
// Production imports and the real SSR smoke checks continue to use Swiper itself.
import React from 'react';

export function Swiper({children,className,dir,slidesPerView,navigation,pagination,allowTouchMove}) {
 return React.createElement('div',{
   className:['swiper',className].filter(Boolean).join(' '),dir,
   'data-slides-per-view':slidesPerView,
   'data-navigation':Boolean(navigation),
   'data-pagination':Boolean(pagination),
   'data-touch':Boolean(allowTouchMove),
 },React.createElement('div',{className:'swiper-wrapper'},children));
}

export function SwiperSlide({children}) {
 return React.createElement('div',{className:'swiper-slide'},children);
}
