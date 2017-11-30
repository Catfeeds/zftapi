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
