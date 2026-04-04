import { IsUUID } from "class-validator";

export class InitializePaystackDto {
  @IsUUID()
  tripId!: string;
}
