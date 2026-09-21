// Adapted from React Bits AnimatedList (JS + CSS), installed with shadcn.
// Changes: semantic list, native disclosure controls, no global keyboard capture,
// reduced motion, gentler one-time entrance, stable record keys, full-page scrolling.
// See skills/website-history/assets/report/REACT-BITS-LICENSE.txt.
import {useRef} from 'react';
import {motion, useInView, useReducedMotion} from 'motion/react';
import './AnimatedList.css';
function AnimatedItem({children, index}) {
  const ref = useRef(null);
  const inView = useInView(ref, {amount:0.05, once:true});
  const reduced = useReducedMotion();
  return <motion.li ref={ref} initial={false}
    animate={reduced || inView ? {opacity:1,y:0} : {opacity:0.6,y:12}}
    transition={{duration:reduced ? 0 : 0.35, delay:reduced ? 0 : Math.min(index * 0.025,0.15)}}>
    {children}
  </motion.li>;
}
export default function AnimatedList({items, renderItem}) {
  return <ol className="scroll-list">{items.map((item,index) => <AnimatedItem key={`${item.input_id}-${index}`} index={index}>{renderItem(item,index)}</AnimatedItem>)}</ol>;
}
