import { Children, isValidElement, type ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './contentSwiper.css';

interface Props {
  children: ReactNode;
  label: string;
  variant?: 'media' | 'cards';
}

/** One responsive RTL carousel for public media and cards, with no automatic playback. */
export default function ContentSwiper({ children, label, variant = 'media' }: Props) {
  const slides = Children.toArray(children);
  if (!slides.length) return null;
  const multiple = slides.length > 1;
  return (
    <div role="region" aria-label={label} className="min-w-0">
      <Swiper
        dir="rtl"
        className={'cs-content-swiper cs-content-swiper-' + variant}
        modules={[Navigation, Pagination, A11y]}
        slidesPerView={variant === 'cards' && multiple ? 1.15 : 1}
        breakpoints={variant === 'cards' ? {640:{slidesPerView:Math.min(2, slides.length)},1024:{slidesPerView:Math.min(3, slides.length)}} : undefined}
        spaceBetween={16}
        navigation={multiple}
        pagination={multiple ? { clickable: true } : false}
        watchOverflow
        allowTouchMove={multiple}
        noSwipingSelector="video, iframe, input, textarea, select"
        a11y={{ enabled:true, prevSlideMessage:'הקודם', nextSlideMessage:'הבא', firstSlideMessage:'פריט ראשון', lastSlideMessage:'פריט אחרון', paginationBulletMessage:'מעבר לפריט {{index}}', slideLabelMessage:'{{index}} מתוך {{slidesLength}}' }}
      >
        {slides.map((slide,index)=><SwiperSlide key={isValidElement(slide) ? slide.key ?? index : index}>{slide}</SwiperSlide>)}
      </Swiper>
    </div>
  );
}
