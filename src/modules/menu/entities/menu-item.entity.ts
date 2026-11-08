import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 64, default: 'org_8492a158b' })
  organizationId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: false })
  isVisibleOnMenu: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
