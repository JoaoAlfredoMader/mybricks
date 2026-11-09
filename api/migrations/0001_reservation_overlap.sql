-- No overlap between CONFIRMED reservations of the same property.
-- Half-open range [check_in, check_out): same-day turnover is allowed.
-- SQLite has no EXCLUDE constraint (Postgres had one), so a trigger refuses the write. It runs inside the
-- statement, so it holds under concurrency too: D1 serialises writes.
-- The API turns the 'reservation_overlap' message into a 409.
CREATE TRIGGER trg_reservations_no_overlap_insert
BEFORE INSERT ON reservations
WHEN NEW.status = 'confirmed' AND EXISTS (
  SELECT 1 FROM reservations r
  WHERE r.property_id = NEW.property_id AND r.status = 'confirmed'
    AND r.check_in < NEW.check_out AND r.check_out > NEW.check_in
)
BEGIN
  SELECT RAISE(ABORT, 'reservation_overlap');
END;
--> statement-breakpoint
CREATE TRIGGER trg_reservations_no_overlap_update
BEFORE UPDATE OF property_id, check_in, check_out, status ON reservations
WHEN NEW.status = 'confirmed' AND EXISTS (
  SELECT 1 FROM reservations r
  WHERE r.id <> NEW.id AND r.property_id = NEW.property_id AND r.status = 'confirmed'
    AND r.check_in < NEW.check_out AND r.check_out > NEW.check_in
)
BEGIN
  SELECT RAISE(ABORT, 'reservation_overlap');
END;
