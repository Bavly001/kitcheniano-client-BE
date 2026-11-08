import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('client_carts')
export class ClientCart {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  clientId: number;

  @Index()
  @Column({ type: 'varchar', length: 64, default: 'org_8492a158b' })
  organizationId: string;

  @Column()
  menuItemId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
