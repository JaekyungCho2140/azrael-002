-- 유료화 상품 협의 일정 Offset 필드 추가
-- projects 테이블에 paid_product_offset, show_paid_product_date 컬럼 추가
-- calculation_results 테이블에 paid_product_date 컬럼 추가

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS paid_product_offset INTEGER,
  ADD COLUMN IF NOT EXISTS show_paid_product_date BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE calculation_results
  ADD COLUMN IF NOT EXISTS paid_product_date DATE;
