const validatorRunner = Include('/libs/validator')

let validatorSchema = validatorRunner.alloc()

exports.Validate = (path, data)=>{
  validatorSchema.run(path, data)
}

// const hfmt = [
//     {
//         method: null,
//         options: null,
//         customer: (value) => {
//             return Typedef.isHouseFormat(value);
//         }
//     },
// ];
// const projectId = [
//     {
//         method: 'isLength',
//         options: {
//             min: 0,
//             max: 64
//         }
//     }
// ];

validatorSchema.create('/houses', {
  hfmt:{
  },
  code:[{
    method: 'isLength',
    options: {
      min: 0,
      max: 10
    }
  }],
  location:[
    {
      customer:(value)=>{
        return value.name && value.address && value.divisionCode
      }
    }
  ],
  community:[
    {
      method: 'isLength',
      options:{
        min:0, max: 20
      }
    }
  ],
  roomNumber:[
    {
      method: 'isInt'
    }
  ]
})