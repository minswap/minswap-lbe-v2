use aiken/builtin
use lb_v2/types.{FactoryDatum}
use lb_v2/utils.{sort_two_consecutive_factory_datum}

test test_sort_two_consecutive_factory_datum() {
  let datum_a = FactoryDatum { head: #"00", tail: #"646174756d5f62" }
  let datum_b =
    FactoryDatum { head: #"646174756d5f62", tail: #"ffffffffffffff00" }

  let (d1, d2) = sort_two_consecutive_factory_datum(datum_b, datum_a)
  and {
    builtin.serialise_data(d1) == builtin.serialise_data(datum_a),
    builtin.serialise_data(d2) == builtin.serialise_data(datum_b),
  }
}
