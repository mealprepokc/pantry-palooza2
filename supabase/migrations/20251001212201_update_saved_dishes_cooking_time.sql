/*
  # Update saved_dishes table to use cooking_time

  1. Changes
    - Drop the image_url column from saved_dishes table
    - Add cooking_time column to saved_dishes table
  
  2. Notes
    - This migration changes the structure to remove image storage
    - Adds cooking time information for saved dishes
    - Uses IF EXISTS/IF NOT EXISTS for safety
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_dishes' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE saved_dishes DROP COLUMN image_url;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_dishes' AND column_name = 'cooking_time'
  ) THEN
    ALTER TABLE saved_dishes ADD COLUMN cooking_time text NOT NULL DEFAULT '30 mins';
  END IF;
END $$;
