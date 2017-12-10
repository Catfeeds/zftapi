CREATE DATABASE IF NOT EXISTS zft;
USE zft;

create table if not exists contracts
(
	`id` bigint auto_increment,
	roomId bigint default '0' not null,
	userId bigint default '0' not null,
	`from` bigint default '0' not null,
	`to` bigint default '0' not null,
	strategy text null,
	expenses text null,
	paymentPlan varchar(3) not null,
	signUpTime bigint default '0' not null,
  primary key (`id`)
) engine=innodb default charset=utf8;

create table if not exists bills
(
	id bigint auto_increment,
	flow varchar(10) default 'receive' not null,
	entity varchar(10) default 'tenant' not null,
	relativeID bigint default '0' not null,
	projectId varchar(64) not null,
	`source` tinyint(1) default '0' not null,
	`type` tinyint(1) default '0' not null,
	billFrom bigint default '0' not null,
	billTo bigint default '0' not null,
	paidAt bigint default '0' not null,
	amount bigint null,
	submitter bigint default '0' not null,
	operator bigint default '0' not null,
	timeCreate bigint default '0' not null,
	remark varchar(255) default '' null,
	metadata text null,
	primary key (`id`)
) engine=innodb default charset=utf8;

create table if not exists users
(
	id bigint auto_increment,
	accountName varchar(32) not null,
	`name` varchar(24) not null,
	mobile varchar(13) not null,
	documentId text null,
	documentType int default '1' null,
	gender varchar(1) default 'M' not null,
	constraint users_accountName_unique
		unique (accountName),
		primary key (`id`)
) engine=innodb default charset=utf8;

create table if not exists housetype
(
	id bigint auto_increment,
	houseId bigint not null,
	name varchar(10) default '' not null,
	bedroom int default '0' not null,
	livingRoom int default '0' not null,
	bathroom int default '0' not null,
	orientation varchar(2) default 'N' not null,
	roomArea int default '0' not null,
	remark varchar(255) default '' not null,
  primary key (`id`)
) engine=innodb default charset=utf8;

create table if not exists houses
(
	id bigint auto_increment,
	code varchar(10) default '' not null,
	houseFormat varchar(12) default 'individual' not null,
	projectId varchar(64) default '' not null,
	community varchar(255) default '' not null,
	`group` varchar(10) default '' not null,
	building varchar(10) default '' not null,
	unit varchar(10) default '' not null,
	roomNumber varchar(10) default '' not null,
	roomArea int default '0' not null,
	currentFloor int default '0' not null,
	totalFloor int default '0' not null,
	roomCountOnFloor int default '0' not null,
	createdAt bigint default '0' not null,
	deleteAt bigint default '0' not null,
	`desc` varchar(255) null,
	status varchar(10) default 'open' not null,
	config text null,
  primary key (`id`)
) engine=innodb default charset=utf8;

create table if not exists location
(
	id int auto_increment,
	houseId bigint not null,
	divisionId bigint not null,
	name varchar(255) not null,
	address varchar(255) not null,
	longitude double not null,
	latitude double not null,
  primary key (`id`)
) engine=innodb default charset=utf8;

create table if not exists division
(
	id int auto_increment,
	name varchar(255) not null,
  primary key (`id`)
) engine=innodb default charset=utf8;

create table if not exists `settings`
(
	id int auto_increment,
	projectId bigint null,
	`group` varchar(128) default '' not null,
	`key` varchar(255) default '' not null,
	value varchar(255) default '' not null,
  primary key (`id`)
) engine=innodb default charset=utf8;



