import Joi from 'joi';
import moment from 'moment-timezone';

export const createUserSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  birthday: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .custom((value, helpers) => {
      const date = moment(value, 'YYYY-MM-DD', true);
      if (!date.isValid()) {
        return helpers.error('any.invalid');
      }
      if (date.isAfter(moment())) {
        return helpers.error('date.future');
      }
      return value;
    })
    .messages({
      'string.pattern.base': 'Birthday must be in YYYY-MM-DD format',
      'any.invalid': 'Invalid date',
      'date.future': 'Birthday cannot be in the future',
    }),
  timezone: Joi.string()
    .required()
    .custom((value, helpers) => {
      const validTimezones = moment.tz.names();
      if (!validTimezones.includes(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'Invalid timezone. Use IANA timezone format (e.g., America/New_York)',
    }),
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(1).max(100),
  lastName: Joi.string().min(1).max(100),
  email: Joi.string().email(),
  birthday: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value, helpers) => {
      const date = moment(value, 'YYYY-MM-DD', true);
      if (!date.isValid()) {
        return helpers.error('any.invalid');
      }
      if (date.isAfter(moment())) {
        return helpers.error('date.future');
      }
      return value;
    }),
  timezone: Joi.string().custom((value, helpers) => {
    const validTimezones = moment.tz.names();
    if (!validTimezones.includes(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }),
  isActive: Joi.boolean(),
}).min(1);
