import {
  Salad,
   Soup as HeartPulse
} from "lucide-react";

import {
  FaAppleAlt, FaCarrot, FaEgg, FaFish, FaCheese, FaCoffee, FaBreadSlice, FaCookieBite
} from "react-icons/fa";
import { MdRiceBowl, MdLocalDrink } from "react-icons/md";
import { GiNoodles, GiSaltShaker } from "react-icons/gi";
import { AiOutlineProduct } from "react-icons/ai";

// 카테고리 타입 정의
export type CategoryName = 
  | "전체"
  | "과일"
  | "채소"
  | "쌀_잡곡_견과"
  | "정육_계란류"
  | "수산물_건해산"
  | "우유_유제품"
  | "김치_반찬_델리"
  | "생수_음료_주류"
  | "커피_원두_차"
  | "면류_통조림"
  | "양념_오일"
  | "과자_간식"
  | "베이커리_잼"
  | "건강식품";

// 색상 상수 정의
const COLORS = {
  GRAY: "#374151",
  RED: "#dc2626",
  GREEN: "#059669",
  ORANGE: "#d97706",
  YELLOW: "#f59e0b",
  BLUE: "#2563eb",
  LIGHT_YELLOW: "#fbbf24",
  LIGHT_BLUE: "#3b82f6",
  BROWN: "#92400e",
  LIGHT_ORANGE: "#f97316",
  PINK: "#be185d"
} as const;

// 아이콘 크기 상수
const ICON_SIZE = 28;

// 카테고리 아이콘 매핑
export const CATEGORY_ICONS: Record<CategoryName, React.ReactNode> = {
  "전체": <AiOutlineProduct size={ICON_SIZE} color={COLORS.GRAY} />,
  "과일": <FaAppleAlt size={ICON_SIZE} color={COLORS.RED} />,
  "채소": <FaCarrot size={ICON_SIZE} color={COLORS.GREEN} />,
  "쌀_잡곡_견과": <MdRiceBowl size={ICON_SIZE} color={COLORS.ORANGE} />,
  "정육_계란류": <FaEgg size={ICON_SIZE} color={COLORS.YELLOW} />,
  "수산물_건해산": <FaFish size={ICON_SIZE} color={COLORS.BLUE} />,
  "우유_유제품": <FaCheese size={ICON_SIZE} color={COLORS.LIGHT_YELLOW} />,
  "김치_반찬_델리": <Salad size={ICON_SIZE} color={COLORS.RED} />,
  "생수_음료_주류": <MdLocalDrink size={ICON_SIZE} color={COLORS.LIGHT_BLUE} />,
  "커피_원두_차": <FaCoffee size={ICON_SIZE} color={COLORS.BROWN} />,
  "면류_통조림": <GiNoodles size={ICON_SIZE} color={COLORS.YELLOW} />,
  "양념_오일": <GiSaltShaker size={ICON_SIZE} color={COLORS.LIGHT_ORANGE} />,
  "과자_간식": <FaCookieBite size={ICON_SIZE} color={COLORS.PINK} />,
  "베이커리_잼": <FaBreadSlice size={ICON_SIZE} color={COLORS.ORANGE} />,
  "건강식품": <HeartPulse size={ICON_SIZE} color={COLORS.RED} />
};

// 카테고리별 설명 정보
export const CATEGORY_DESCRIPTIONS: Record<CategoryName, string> = {
  "전체": "모든 상품",
  "과일": "신선한 과일",
  "채소": "신선한 채소",
  "쌀_잡곡_견과": "쌀, 잡곡, 견과류",
  "정육_계란류": "정육, 계란",
  "수산물_건해산": "수산물, 건해산",
  "우유_유제품": "우유, 유제품",
  "김치_반찬_델리": "김치, 반찬, 델리",
  "생수_음료_주류": "생수, 음료, 주류",
  "커피_원두_차": "커피, 원두, 차",
  "면류_통조림": "면류, 통조림",
  "양념_오일": "양념, 오일",
  "과자_간식": "과자, 간식",
  "베이커리_잼": "베이커리, 잼",
  "건강식품": "건강식품"
};

// 카테고리 그룹화
export const CATEGORY_GROUPS = {
  FRESH: ["과일", "채소", "정육_계란류", "수산물_건해산", "우유_유제품"] as const,
  PROCESSED: ["김치_반찬_델리", "면류_통조림", "베이커리_잼", "과자_간식"] as const,
  BEVERAGES: ["생수_음료_주류", "커피_원두_차"] as const,
  STAPLES: ["쌀_잡곡_견과", "양념_오일"] as const,
  HEALTH: ["건강식품"] as const
} as const;

// 유틸리티 함수들
export const getCategoryIcon = (categoryName: string): React.ReactNode => {
  return CATEGORY_ICONS[categoryName as CategoryName] || CATEGORY_ICONS["전체"];
};

export const getCategoryDescription = (categoryName: string): string => {
  return CATEGORY_DESCRIPTIONS[categoryName as CategoryName] || CATEGORY_DESCRIPTIONS["전체"];
};

export const isValidCategory = (categoryName: string): categoryName is CategoryName => {
  return categoryName in CATEGORY_ICONS;
};

export const getAllCategories = (): readonly CategoryName[] => {
  return Object.keys(CATEGORY_ICONS) as CategoryName[];
};
