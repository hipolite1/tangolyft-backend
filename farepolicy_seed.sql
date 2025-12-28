INSERT INTO "FarePolicy"
("id","city","serviceType","currency","baseFare","perKmFare","perMinFare","bookingFee","isActive","createdAt","updatedAt")
VALUES
(gen_random_uuid(),'ABUJA','BIKE_DELIVERY','NGN',300,80,20,50,true,now(),now())
ON CONFLICT ("city","serviceType","isActive")
DO UPDATE SET
  "currency"=EXCLUDED."currency",
  "baseFare"=EXCLUDED."baseFare",
  "perKmFare"=EXCLUDED."perKmFare",
  "perMinFare"=EXCLUDED."perMinFare",
  "bookingFee"=EXCLUDED."bookingFee",
  "updatedAt"=now();

INSERT INTO "FarePolicy"
("id","city","serviceType","currency","baseFare","perKmFare","perMinFare","bookingFee","isActive","createdAt","updatedAt")
VALUES
(gen_random_uuid(),'ABUJA','CAR_RIDE','NGN',500,120,30,100,true,now(),now())
ON CONFLICT ("city","serviceType","isActive")
DO UPDATE SET
  "currency"=EXCLUDED."currency",
  "baseFare"=EXCLUDED."baseFare",
  "perKmFare"=EXCLUDED."perKmFare",
  "perMinFare"=EXCLUDED."perMinFare",
  "bookingFee"=EXCLUDED."bookingFee",
  "updatedAt"=now();
