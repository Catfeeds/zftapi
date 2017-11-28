CREATE DATABASE IF NOT EXISTS zft;
USE zft;

create table if not exists contracts
(
	contractid bigint auto_increment,
	hrid bigint default '0' not null,
	uid bigint default '0' not null,
	`from` bigint default '0' not null,
	`to` bigint default '0' not null,
	strategy text null,
	expenses text null,
	paytime varchar(3) not null,
	signtime bigint default '0' not null,
  primary key (`contractid`)
) engine=innodb default charset=utf8;

