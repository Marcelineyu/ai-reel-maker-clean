export const PREVIEW_SCENES = [
  {
    n: 1,
    desc: 'Exterior, shopfront at dawn',
    src: `${process.env.PUBLIC_URL}/images/preview/scene-1-cafe-exterior.png`,
    alt: 'Tokyo coffee shop exterior at dawn with warm light through the window',
  },
  {
    n: 2,
    desc: 'Barista preparing the first pour-over',
    src: `${process.env.PUBLIC_URL}/images/preview/scene-2-barista.png`,
    alt: 'Barista preparing pour-over coffee behind the counter',
  },
  {
    n: 3,
    desc: 'Regular customer at the window seat',
    src: `${process.env.PUBLIC_URL}/images/preview/scene-3-window-customer.png`,
    alt: 'Customer sitting by the window with coffee and a notebook',
  },
  {
    n: 4,
    desc: 'Steam rises from the final cup.',
    src: `${process.env.PUBLIC_URL}/images/preview/scene-4-steaming-coffee.png`,
    alt: 'Close-up of a steaming cup of coffee on the counter',
  },
];

export const PREVIEW_PUBLISHING = {
  main: PREVIEW_SCENES[0],
  strip: PREVIEW_SCENES.slice(1),
};
