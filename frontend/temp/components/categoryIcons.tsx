import {
  Box, Apple, Leaf, Drumstick, Fish, Milk, Salad,
  Coffee, Soup, Soup as Can, Cookie, HeartPulse
} from "lucide-react";

import {
  FaAppleAlt, FaCarrot, FaEgg, FaFish, FaCheese, FaWineBottle, FaCoffee, FaBreadSlice, FaCookieBite, FaSeedling
} from "react-icons/fa";
import { MdRiceBowl, MdLocalDrink } from "react-icons/md";
import { GiNoodles, GiSaltShaker, GiSlicedBread } from "react-icons/gi";

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "전체": <Box size={24} />,                       // 전체 = 박스
  "과일": <FaAppleAlt size={22} color="#c0392b" />, // 사과
  "채소": <FaCarrot size={22} color="#27ae60" />,   // 당근
  "쌀_잡곡_견과": <MdRiceBowl size={22} color="#f5e6b7" />, // 쌀/견과
  "정육_계란류": <FaEgg size={22} color="#f7d794" />,      // 달걀
  "수산물_건해산": <FaFish size={22} color="#2980b9" />,   // 생선
  "우유_유제품": <FaCheese size={22} color="#f9ca24" />,   // 치즈(유제품)
  "김치_반찬_델리": <Salad size={22} color="#e17055" />,   // 샐러드(반찬)
  "생수_음료_주류": <MdLocalDrink size={22} color="#74b9ff" />, // 생수/음료
  "커피_원두_차": <FaCoffee size={22} color="#6d4c41" />,  // 커피잔
  "면류_통조림": <GiNoodles size={22} color="#f5cd79" />, // 면발
  "양념_오일": <GiSaltShaker size={22} color="#ffbe76" />, // 소금
  "과자_간식": <FaCookieBite size={22} color="#e17055" />, // 쿠키
  "베이커리_잼": <FaBreadSlice size={22} color="#f7b731" />, // 식빵
  "건강식품": <HeartPulse size={22} color="#e74c3c" />      // 심장(건강)
};
